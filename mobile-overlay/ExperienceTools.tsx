import { useEffect, useRef, useState } from "react";
import { Badge, Box, Button, Group, Modal, Paper, Slider, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import RealFootballNewsView from "./RealFootballNewsView";

const KEY_NAME = "j90_manager_name", KEY_NICK = "j90_manager_nickname";
const KEY_MUSIC = "j90_music_enabled", KEY_EFFECTS = "j90_effects_enabled", KEY_VOLUME = "j90_music_volume";
function get(key: string, fallback = ""): string { try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

export default function ExperienceTools({ onProfileChange }: { onProfileChange: (label: string) => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [name, setName] = useState(() => get(KEY_NAME));
  const [nickname, setNickname] = useState(() => get(KEY_NICK));
  const [musicOn, setMusicOn] = useState(() => get(KEY_MUSIC, "false") === "true");
  const [effectsOn, setEffectsOn] = useState(() => get(KEY_EFFECTS, "true") !== "false");
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(100, Number(get(KEY_VOLUME,"18")) || 18)));
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const profileLabel = nickname.trim() || name.trim() || "Treinador";

  useEffect(() => { onProfileChange(profileLabel); }, [profileLabel, onProfileChange]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    try { window.localStorage.setItem(KEY_VOLUME, String(volume)); } catch { /* optional storage */ }
    if (musicOn) void audio.play().catch(() => { /* WebView requires a tap */ });
    else { audio.pause(); audio.currentTime = 0; }
  }, [musicOn, volume]);

  useEffect(() => {
    try { window.localStorage.setItem(KEY_EFFECTS, String(effectsOn)); } catch { /* optional storage */ }
    if (!effectsOn) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("[data-no-ui-sound]")) return;
      const extended = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Context = window.AudioContext ?? extended.webkitAudioContext;
      if (!Context) return;
      try {
        const audio = contextRef.current ?? new Context();
        contextRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(760, now);
        oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.065);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.014, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(now); oscillator.stop(now + 0.08);
      } catch { /* audio feedback never blocks interaction */ }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [effectsOn]);

  function saveProfile() {
    try { window.localStorage.setItem(KEY_NAME, name.trim()); window.localStorage.setItem(KEY_NICK, nickname.trim()); } catch { /* optional storage */ }
    onProfileChange(nickname.trim() || name.trim() || "Treinador");
    setSaved(true);
  }
  function toggleMusic(checked: boolean) {
    setMusicOn(checked);
    try { window.localStorage.setItem(KEY_MUSIC, String(checked)); } catch { /* optional storage */ }
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    if (checked) void audio.play().catch(() => setSaved(false));
    else { audio.pause(); audio.currentTime = 0; }
  }

  return <>
    <audio ref={audioRef} src="/audio/relax_background1_0.ogg" loop preload="auto" />
    <Group gap={4} wrap="nowrap">
      <Button size="xs" variant="light" onClick={() => setNewsOpen(true)}>Notícias</Button>
      <Button size="xs" variant="default" onClick={() => setSettingsOpen(true)}>Perfil/áudio</Button>
    </Group>

    <Modal opened={settingsOpen} onClose={() => setSettingsOpen(false)} title="Perfil do treinador e áudio" centered size="md">
      <Stack gap="md">
        <Paper withBorder radius="md" p="sm">
          <Title order={3} fz="lg">Meu treinador</Title>
          <Text c="dimmed" size="xs" mt={4} mb="sm">Nome e apelido ficam salvos neste dispositivo.</Text>
          <Stack gap="sm">
            <TextInput label="Nome do manager" placeholder="Ex.: Victor Luiz" value={name} maxLength={48} onChange={(event) => { setName(event.currentTarget.value); setSaved(false); }} />
            <TextInput label="Apelido" placeholder="Ex.: Professor" value={nickname} maxLength={28} onChange={(event) => { setNickname(event.currentTarget.value); setSaved(false); }} />
            <Button onClick={saveProfile}>Salvar perfil</Button>
            {saved && <Text size="sm" c="green">Perfil e preferências salvos.</Text>}
          </Stack>
        </Paper>
        <Paper withBorder radius="md" p="sm">
          <Title order={3} fz="lg">Som ambiente</Title>
          <Text c="dimmed" size="xs" mt={4} mb="sm">Trilha relaxante CC0 e sons de interface discretos. A música começa apenas quando você ativar.</Text>
          <Stack gap="md">
            <Switch checked={musicOn} onChange={(event) => toggleMusic(event.currentTarget.checked)} label="Música de fundo" />
            <Box><Group justify="space-between"><Text size="sm">Volume da música</Text><Text size="sm" c="dimmed">{volume}%</Text></Group><Slider min={0} max={100} step={5} value={volume} onChange={setVolume} disabled={!musicOn} mt="sm" /></Box>
            <Switch checked={effectsOn} onChange={(event) => setEffectsOn(event.currentTarget.checked)} label="Retorno sonoro dos botões" />
          </Stack>
        </Paper>
        <Text c="dimmed" size="xs">Música em loop CC0 do OpenGameArt. Os sons da interface são sintetizados pelo próprio app.</Text>
        <Group justify="flex-end"><Button variant="default" onClick={() => setSettingsOpen(false)}>Fechar</Button></Group>
      </Stack>
    </Modal>

    <Modal opened={newsOpen} onClose={() => setNewsOpen(false)} title="Jornada 90 · Central de Notícias" centered size="lg">
      <RealFootballNewsView />
      <Group justify="flex-end" mt="md"><Button variant="default" onClick={() => setNewsOpen(false)}>Fechar notícias</Button></Group>
    </Modal>
  </>;
}
