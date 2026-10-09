#!/usr/bin/env bash
#
# Drives `check-toolchain-pin.sh` against deliberately broken repositories.
#
# The point is not coverage for its own sake. This project's rule is that a gate nobody has
# watched go red is not a gate, and a shell script that greps YAML is exactly the kind of check
# that rots quietly: a regex loosened during a refactor still exits 0 on the real repository,
# because the real repository is correct. Each fixture below names a way the toolchain could be
# selected wrongly, and asserts this script notices.
#
# Every "must fail" case here was a real bypass at some point.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$here/check-toolchain-pin.sh"
fixtures="$here/tests/toolchain-pin"

passed=0
failed=0

# expect_at <expected exit status> <workflow dir> <toolchain file> <what this proves>
expect_at() {
    local want="$1" workflows="$2" toolchain="$3" description="$4"
    local output status

    output="$("$script" "$workflows" "$toolchain" 2>&1)"
    status=$?

    if [ "$status" -eq "$want" ]; then
        passed=$((passed + 1))
        printf '  ok    %s\n' "$description"
    else
        failed=$((failed + 1))
        printf '  FAIL  %s\n' "$description"
        printf '        expected exit %s, got %s. Output was:\n' "$want" "$status"
        printf '        %s\n' "$output"
    fi
}

# expect <expected exit status> <fixture> <what this proves>
expect() {
    expect_at "$1" "$fixtures/$2/workflows" "$fixtures/$2/rust-toolchain.toml" "$3"
}

# Three cases are generated rather than committed, because what each one tests is a property of
# the *bytes* rather than of the text — a size, or a line ending — and a checked-in file cannot
# be relied on to keep either. Each generator says which.
generated_scratch="$(mktemp -d)"
trap 'rm -rf "$generated_scratch"' EXIT

# What these two hold shut: `grep -q` stops at its first match, whatever is feeding it takes
# SIGPIPE, and `pipefail` then calls the pipeline failed. Every match test in the script under
# test reads that inverted status as "no match" and skips the file. The offending line therefore
# has to be followed by more than a pipe buffer's worth of anything at all, and a 300 KB fixture
# checked into this directory would be a strange thing to meet. Both pass against `develop`.
#
# oversized <name> <body>  ->  echoes the workflow directory
oversized() {
    # Three statements, not one `local`: bash expands the whole command line before `local` runs,
    # so a `dir="…/$name"` on the same line reads the *global* `name` and trips `set -u`. That
    # aborted the command substitution, `expect_at` was handed an empty path, and the script under
    # test failed on the missing directory — exit 1, which is what these two cases expect. A false
    # pass, in the suite whose whole job is to not have those.
    local name="$1"
    local body="$2"
    local dir="$generated_scratch/$name"

    mkdir -p "$dir/workflows"
    printf '[toolchain]\nchannel = "1.95.0"\n' > "$dir/rust-toolchain.toml"
    {
        printf 'name: %s\non: [workflow_dispatch]\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n' "$name"
        printf '%s\n' "$body"
        # Comfortably past the 64 KB pipe buffer, so the feeding process is still writing when
        # grep finds the match above and leaves.
        for _ in $(seq 4000); do
            printf '      - run: echo padding-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n'
        done
    } > "$dir/workflows/$name.yml"

    printf '%s' "$dir"
}

# Generated for a different reason than the oversized pair: a CRLF fixture cannot safely be
# committed. There is no `.gitattributes` here today, so the file's line endings depend on
# whoever checks it out — and the day one is added, or someone's `core.autocrlf` normalises it,
# the fixture quietly becomes a duplicate of an LF case that passes for the wrong reason. Writing
# the CRs here means the bytes under test are the bytes intended.
#
# crlf <name> <body>  ->  echoes the workflow directory
crlf() {
    local name="$1"
    local body="$2"
    local dir="$generated_scratch/$name"

    mkdir -p "$dir/workflows"
    printf '[toolchain]\nchannel = "1.95.0"\n' > "$dir/rust-toolchain.toml"
    {
        printf 'name: %s\non: [workflow_dispatch]\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n' "$name"
        printf '%s\n' "$body"
    } | sed 's/$/\r/' > "$dir/workflows/$name.yml"

    printf '%s' "$dir"
}

echo "check-toolchain-pin.test: accepted repositories"
expect 0 agreeing \
    "a workflow pinned to the toolchain file's channel, beside one that builds no Rust"
expect 0 cargo-only-in-a-comment \
    "the word cargo in a comment is not a Rust build"
expect 0 cargo-deny-without-a-toolchain \
    "cargo deny and cargo machete compile nothing, so they need no toolchain step"
expect 0 exempt-tools-with-separators \
    "the exempt tools ended by a shell separator rather than a space, which must not read as a build"

echo "check-toolchain-pin.test: rejected repositories"
expect 1 mismatched-action-pin \
    "an action pin naming a different version from rust-toolchain.toml"
expect 1 moving-channel \
    "rust-toolchain.toml pinning a moving channel"
expect 1 cargo-plus-toolchain \
    "cargo +nightly, which overrides rust-toolchain.toml outright"
expect 1 unpinned-cargo-build \
    "a cargo job with no toolchain step, in a repository whose other workflow is pinned"
expect 1 unpinned-tauri-cli-build \
    "a Rust build spelled as npx tauri build rather than cargo"
expect 1 cargo-deny-hiding-a-build \
    "a real cargo build in a workflow that also runs the exempt tools, including builds chained onto their own lines"
expect 1 exempt-tool-lookalike \
    "a subcommand that only starts with an exempt tool's name, which the exemption must not cover"
expect 1 build-across-a-continuation \
    "a cargo build split over a shell line continuation, which no per-line pattern can see"
expect 1 plus-toolchain-across-a-continuation \
    "cargo +nightly split over a continuation, in a workflow that is otherwise correctly pinned"
expect 1 plus-toolchain-behind-a-comment \
    "a split cargo +nightly in a workflow whose comments also mention it, which used to shadow the real one"

oversized_build="$(oversized oversized-build '      - uses: actions/checkout@v4
      - run: cargo build --release')"
expect_at 1 "$oversized_build/workflows" "$oversized_build/rust-toolchain.toml" \
    "an unpinned cargo build in a workflow too large to fit the pipe buffer, which grep -q used to hide"

oversized_plus="$(oversized oversized-plus '      - uses: dtolnay/rust-toolchain@1.95.0
      - run: |
          cargo \
            +nightly build')"
expect_at 1 "$oversized_plus/workflows" "$oversized_plus/rust-toolchain.toml" \
    "the same, on the continuation pass, where the skip is silent and there is no second detector"

crlf_build="$(crlf crlf-continuation '      - uses: actions/checkout@v4
      - run: |
          cargo \
            build --release')"
expect_at 1 "$crlf_build/workflows" "$crlf_build/rust-toolchain.toml" \
    "a continuation in a CRLF workflow, where the backslash is no longer the last character"

echo ""
if [ "$failed" -ne 0 ]; then
    echo "check-toolchain-pin.test: $failed of $((passed + failed)) cases failed" >&2
    exit 1
fi

echo "check-toolchain-pin.test: all $passed cases behaved as expected"
