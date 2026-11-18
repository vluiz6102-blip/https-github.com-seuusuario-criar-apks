import "./styles.css";
import { buildPartMessage, buildServiceMessage, buildWhatsAppUrl } from "./lib/messages";

type Service = {
  id: string;
  category: "Hardware" | "Software" | "Suporte";
  name: string;
  description: string;
  icon: string;
};
type Screen = "inicio" | "servicos" | "pecas" | "sobre" | "solicitar";

const PHONE = "5546991194904";
const INSTAGRAM = "https://instagram.com/vxctor.luiz";
const services: Service[] = [
  { id: "clean", category: "Hardware", name: "Limpeza preventiva", description: "Remoção cuidadosa de poeira e sujeira para ajudar a conservar seu equipamento.", icon: "✳" },
  { id: "ssd", category: "Hardware", name: "Instalação de SSD", description: "Instalação ou substituição de armazenamento, conforme a compatibilidade do equipamento.", icon: "▣" },
  { id: "ram", category: "Hardware", name: "Upgrade de memória RAM", description: "Expansão de memória para ampliar a capacidade de multitarefa.", icon: "▤" },
  { id: "windows", category: "Software", name: "Instalação do Windows", description: "Instalação ou reinstalação do sistema e configuração inicial.", icon: "⊞" },
  { id: "format", category: "Software", name: "Formatação e configuração", description: "Preparação do sistema, drivers, atualizações e configurações essenciais.", icon: "⌘" },
  { id: "programs", category: "Software", name: "Instalação de programas", description: "Instalação e configuração de aplicativos e ferramentas.", icon: "◈" },
  { id: "drivers", category: "Software", name: "Drivers e atualizações", description: "Instalação de drivers e atualização dos componentes do sistema.", icon: "↻" },
  { id: "support", category: "Suporte", name: "Avaliação inicial", description: "Entendimento inicial do problema e orientação sobre os próximos passos.", icon: "⌕" }
];

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("A estrutura principal do aplicativo não foi encontrada.");

let screen: Screen = "inicio";
let filter = "Todos";
let selectedServiceId = "support";
let toastTimer = 0;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character] ?? character;
  });
}

function openWhatsApp(message: string): void {
  const url = buildWhatsAppUrl(PHONE, message);
  const tab = window.open(url, "_blank");
  if (tab) {
    tab.opener = null;
  } else {
    window.location.assign(url);
  }
}

function showToast(message: string): void {
  const element = document.querySelector<HTMLDivElement>("#toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove("show"), 3600);
}

function icon(value: string): string {
  return '<span class="service-icon" aria-hidden="true">' + escapeHtml(value) + "</span>";
}

function nav(): string {
  const links: Array<{ id: Screen; label: string }> = [
    { id: "inicio", label: "Início" },
    { id: "servicos", label: "Serviços" },
    { id: "pecas", label: "Peças" },
    { id: "sobre", label: "Sobre" }
  ];
  return '<header class="topbar">' +
    '<button class="brand" data-screen="inicio" aria-label="VIC Tech, página inicial"><span class="brand-mark">V<span>•</span></span><span><b>VIC</b><small>ASSISTÊNCIA TÉCNICA</small></span></button>' +
    '<nav class="desktop-nav" aria-label="Navegação principal">' +
    links.map((link) => '<button data-screen="' + link.id + '" class="' + (screen === link.id ? "active" : "") + '"' + (screen === link.id ? ' aria-current="page"' : "") + ">" + link.label + "</button>").join("") +
    "</nav>" +
    '<a class="top-cta" href="' + buildWhatsAppUrl(PHONE, "Olá! Gostaria de atendimento na VIC.") + '" target="_blank" rel="noopener noreferrer">WhatsApp <span>↗</span></a>' +
    '<button class="mobile-menu" id="mobile-menu" aria-label="Abrir menu" aria-expanded="false">☰</button>' +
    "</header>";
}

function footer(): string {
  return '<footer class="footer">' +
    '<div class="footer-brand"><span class="brand-mark">V<span>•</span></span><div><b>VIC Assistência Técnica</b><small>Tecnologia em boas mãos.</small></div></div>' +
    '<div class="footer-links">' +
    '<a href="' + buildWhatsAppUrl(PHONE, "Olá! Gostaria de atendimento na VIC.") + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
    '<a href="' + INSTAGRAM + '" target="_blank" rel="noopener noreferrer">Instagram</a>' +
    "</div>" +
    "<small>© " + new Date().getFullYear() + " VIC Assistência Técnica. Todos os direitos reservados.</small>" +
    "</footer>";
}

function serviceCard(service: Service): string {
  return '<article class="service-card">' +
    '<div class="service-card-top">' + icon(service.icon) + '<span class="category-tag">' + escapeHtml(service.category) + "</span></div>" +
    "<h3>" + escapeHtml(service.name) + "</h3>" +
    "<p>" + escapeHtml(service.description) + "</p>" +
    '<div class="service-card-bottom"><span>Orçamento sob consulta</span><button class="text-link" data-book-service="' + service.id + '">Solicitar <b>↗</b></button></div>' +
    "</article>";
}

function homePage(): string {
  const featured = services.filter((service) => service.category !== "Suporte").slice(0, 4);
  return '<main>' +
    '<section class="hero"><div class="hero-copy">' +
    '<div class="eyebrow"><i></i> VIC ASSISTÊNCIA TÉCNICA</div>' +
    '<h1>Tecnologia em<br><em>boas mãos.</em></h1>' +
    "<p>Manutenção, upgrades e soluções em software para cuidar do seu equipamento com atenção e transparência.</p>" +
    '<div class="hero-actions"><button class="button primary" data-screen="solicitar">Solicitar atendimento <span>↗</span></button><button class="button secondary" data-screen="servicos">Conhecer serviços</button></div>' +
    '<div class="hero-trust"><span>◈ Hardware & software</span><span>✳ Atendimento direto</span><span>⌁ Peças sob encomenda</span></div>' +
    '</div><div class="hero-art" aria-hidden="true"><div class="glow"></div><div class="device-card laptop"><div class="device-screen"><div class="screen-top"><i></i><i></i><i></i></div><div class="screen-content"><span class="screen-chip">VIC / SYSTEM</span><strong>Seu equipamento.<br><em>Novas possibilidades.</em></strong><div class="screen-bars"><i></i><i></i><i></i></div></div></div><div class="laptop-base"></div></div><div class="floating-chip chip-one">⌘ <span>SOFTWARE</span></div><div class="floating-chip chip-two">▣ <span>HARDWARE</span></div><div class="hero-orbit"></div></div>' +
    '<div class="hero-scroll">ROLE PARA EXPLORAR <span>↓</span></div></section>' +
    '<section class="section intro-strip"><div><span class="eyebrow">SOLUÇÕES PARA O DIA A DIA</span><h2>Seu computador merece<br><em>funcionar no seu melhor.</em></h2></div><p>Da instalação do Windows aos upgrades de hardware, a VIC oferece serviços essenciais para cuidar do seu equipamento, com avaliação e orçamento antes da execução.</p></section>' +
    '<section class="section"><div class="section-heading"><div><span class="eyebrow">O QUE A VIC FAZ</span><h2>Serviços em destaque</h2></div><button class="text-link" data-screen="servicos">Ver todos os serviços ↗</button></div><div class="service-grid">' + featured.map(serviceCard).join("") + "</div></section>" +
    '<section class="order-banner"><div class="order-symbol">＋</div><div><span class="eyebrow">PRECISA DE UM COMPONENTE?</span><h2>Peças sob encomenda,<br><em>sem complicação.</em></h2><p>Conte o que procura. A VIC verifica compatibilidade e consulta disponibilidade antes de apresentar um orçamento.</p></div><button class="button light" data-screen="pecas">Solicitar uma peça <span>↗</span></button></section>' +
    '<section class="section values"><div class="section-heading"><div><span class="eyebrow">O JEITO VIC DE TRABALHAR</span><h2>Confiança em cada etapa.</h2></div></div><div class="value-grid">' +
    '<article><b>01</b><h3>Transparência</h3><p>Você recebe as informações e o orçamento antes de aprovar o serviço.</p></article>' +
    '<article><b>02</b><h3>Cuidado técnico</h3><p>Atenção ao equipamento e aos procedimentos de manutenção.</p></article>' +
    '<article><b>03</b><h3>Hardware + software</h3><p>Atendimento para componentes, sistemas e programas.</p></article>' +
    '<article><b>04</b><h3>Contato direto</h3><p>Converse diretamente com a VIC pelo WhatsApp.</p></article>' +
    "</div></section>" +
    '<section class="contact-band"><div><span class="eyebrow">VAMOS CONVERSAR?</span><h2>O próximo passo começa<br><em>com uma mensagem.</em></h2></div><button class="button primary" data-screen="solicitar">Pedir atendimento ↗</button></section>' +
    "</main>";
}

function servicesPage(): string {
  const categories = ["Todos", "Hardware", "Software", "Suporte"];
  const visible = services.filter((service) => filter === "Todos" || service.category === filter);
  return '<main class="page"><div class="page-hero"><span class="eyebrow">CATÁLOGO VIC</span><h1>O que podemos fazer<br><em>pelo seu equipamento.</em></h1><p>Escolha uma categoria para encontrar o serviço que procura. O atendimento começa com uma conversa e avaliação do equipamento.</p></div>' +
    '<div class="filter-row" role="group" aria-label="Filtrar serviços">' + categories.map((category) => '<button class="filter ' + (filter === category ? "selected" : "") + '" data-filter="' + category + '" aria-pressed="' + (filter === category) + '">' + category + "</button>").join("") + "</div>" +
    '<div class="service-grid full-grid">' + visible.map(serviceCard).join("") + "</div>" +
    '<div class="notice">Os serviços dependem de avaliação e compatibilidade. Valores, condições e prazos são informados antes de qualquer aprovação.</div></main>';
}

function partsPage(): string {
  return '<main class="page"><div class="page-hero"><span class="eyebrow">SOB ENCOMENDA</span><h1>A peça certa para<br><em>o seu equipamento.</em></h1><p>Informe qual componente procura. A VIC verifica as informações disponíveis e conversa com você sobre compatibilidade, disponibilidade e orçamento.</p></div>' +
    '<div class="parts-layout"><div class="parts-info"><div class="parts-art" aria-hidden="true">▦<span>VIC COMPONENTS</span></div><h2>Como funciona?</h2><ol>' +
    '<li><b>Conte o que procura</b><small>Informe a peça e o modelo do equipamento.</small></li>' +
    '<li><b>Verificamos</b><small>Conferimos as informações e consultamos disponibilidade.</small></li>' +
    '<li><b>Você decide</b><small>Você analisa o orçamento antes de confirmar qualquer encomenda.</small></li>' +
    '</ol></div><form class="form-card" id="parts-form" autocomplete="on">' +
    '<span class="eyebrow">SOLICITAR COMPONENTE</span><h2>O que você precisa?</h2>' +
    '<label>Seu nome<input name="name" autocomplete="name" required maxlength="70" placeholder="Como podemos chamar você?"></label>' +
    '<label>Seu WhatsApp<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required minlength="8" maxlength="24" placeholder="(46) 99999-9999"></label>' +
    '<label>Peça ou componente<input name="part" required maxlength="100" placeholder="Ex.: SSD 480 GB, memória DDR4..."></label>' +
    '<label>Equipamento e modelo<input name="device" maxlength="100" placeholder="Ex.: notebook Acer Aspire 5"></label>' +
    '<label>Detalhes adicionais<textarea name="details" rows="3" maxlength="500" placeholder="Compatibilidade, preferência ou outras informações"></textarea></label>' +
    '<label class="consent"><input name="consent" type="checkbox" required><span>Entendi que o WhatsApp será aberto com a mensagem para que eu revise e envie a solicitação.</span></label>' +
    '<button class="button primary wide" type="submit">Continuar pelo WhatsApp ↗</button>' +
    '<small class="form-footnote">Nenhum pedido é confirmado automaticamente. A solicitação só chega à VIC quando você envia a mensagem no WhatsApp.</small>' +
    "</form></div></main>";
}

function serviceRequestPage(): string {
  const options = services.map((service) => '<option value="' + service.id + '"' + (selectedServiceId === service.id ? " selected" : "") + ">" + escapeHtml(service.name) + " · " + service.category + "</option>").join("");
  const current = services.find((service) => service.id === selectedServiceId);
  return '<main class="page"><div class="page-hero"><span class="eyebrow">ATENDIMENTO VIC</span><h1>Vamos entender<br><em>o que você precisa.</em></h1><p>Preencha os dados abaixo. O WhatsApp será aberto com a mensagem pronta para você revisar e enviar.</p></div>' +
    '<div class="request-layout"><aside class="request-aside"><div class="request-aside-icon">V<span>•</span></div><span class="eyebrow">ATENDIMENTO DIRETO</span><h2>' + escapeHtml(current?.name ?? "Conte o que aconteceu") + "</h2><p>" + escapeHtml(current?.description ?? "Explique sua necessidade para que a VIC possa orientar os próximos passos.") + "</p><div class=\"request-aside-note\">O serviço só é realizado após avaliação e sua aprovação do orçamento.</div></aside>" +
    '<form class="form-card" id="service-form" autocomplete="on"><span class="eyebrow">NOVA SOLICITAÇÃO</span><h2>Dados do atendimento</h2>' +
    '<label>Seu nome<input name="name" autocomplete="name" required maxlength="70" placeholder="Seu nome"></label>' +
    '<label>Seu WhatsApp<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required minlength="8" maxlength="24" placeholder="(46) 99999-9999"></label>' +
    '<label>Serviço desejado<select name="service" id="service-select" required>' + options + "</select></label>" +
    '<label>Equipamento e modelo<input name="device" required maxlength="120" placeholder="Ex.: notebook Dell Inspiron 15"></label>' +
    '<label>O que está acontecendo?<textarea name="details" rows="4" required minlength="5" maxlength="800" placeholder="Descreva o problema ou o serviço que precisa..."></textarea></label>' +
    '<label class="consent"><input name="consent" type="checkbox" required><span>Entendi que o WhatsApp será aberto com a mensagem para que eu revise e envie a solicitação.</span></label>' +
    '<button class="button primary wide" type="submit">Revisar solicitação no WhatsApp ↗</button>' +
    '<small class="form-footnote">A VIC só recebe as informações depois que você envia a mensagem. O envio não confirma agendamento nem orçamento.</small>' +
    "</form></div></main>";
}

function aboutPage(): string {
  return '<main class="page"><div class="page-hero"><span class="eyebrow">QUEM ESTÁ POR TRÁS DA VIC</span><h1>Conhecimento, dedicação<br><em>e paixão por tecnologia.</em></h1><p>A VIC nasceu do interesse por hardware, software e pela vontade de oferecer um atendimento cuidadoso e transparente.</p></div>' +
    '<div class="about-grid"><article class="about-main"><span class="about-monogram">VIC<span>•</span></span><h2>Tecnologia em boas mãos.</h2>' +
    "<p>Tenho certificação na área de hardware e conhecimentos práticos sobre componentes, manutenção e funcionamento de equipamentos. Minha experiência inclui contato com desmontagem e manutenção de smartphones Samsung e iPhone, além de instalação e configuração de sistemas operacionais, drivers e programas.</p>" +
    "<p>O objetivo é oferecer soluções úteis, com atenção aos detalhes, orçamento transparente e aprimoramento constante em conhecimento e ferramentas.</p></article>" +
    '<div class="about-facts"><div><b>01</b><span>Certificação na área de hardware</span></div><div><b>02</b><span>Conhecimentos em hardware e software</span></div><div><b>03</b><span>Experiência prática com smartphones</span></div><div><b>04</b><span>Aprendizado e evolução contínuos</span></div></div></div>' +
    '<div class="contact-card"><div><span class="eyebrow">FALE DIRETAMENTE</span><h2>Vamos cuidar do seu equipamento?</h2><p>Explique o que você precisa e receba orientação sobre o atendimento.</p></div><a class="button primary" href="' + buildWhatsAppUrl(PHONE, "Olá! Gostaria de conhecer melhor os serviços da VIC.") + '" target="_blank" rel="noopener noreferrer">Chamar no WhatsApp ↗</a></div></main>';
}

function render(): void {
  const pages: Record<Screen, () => string> = {
    inicio: homePage,
    servicos: servicesPage,
    pecas: partsPage,
    sobre: aboutPage,
    solicitar: serviceRequestPage,
  };
  app!.innerHTML = nav() + pages[screen]() + footer() +
    '<a class="whatsapp-float" href="' + buildWhatsAppUrl(PHONE, "Olá! Gostaria de atendimento na VIC.") + '" target="_blank" rel="noopener noreferrer" aria-label="Falar com a VIC pelo WhatsApp"><span aria-hidden="true">↗</span></a>' +
    '<div id="toast" class="toast" role="status" aria-live="polite"></div>';
  wire();
}

function submitForm(form: HTMLFormElement, kind: "service" | "part"): void {
  const values = Object.fromEntries(new FormData(form).entries());
  const message = kind === "service"
    ? buildServiceMessage({
        name: String(values.name ?? ""),
        phone: String(values.phone ?? ""),
        service: services.find((service) => service.id === String(values.service))?.name ?? "Serviço não especificado",
        device: String(values.device ?? ""),
        details: String(values.details ?? "")
      })
    : buildPartMessage({
        name: String(values.name ?? ""),
        phone: String(values.phone ?? ""),
        part: String(values.part ?? ""),
        device: String(values.device ?? ""),
        details: String(values.details ?? "")
      });
  openWhatsApp(message);
  showToast("WhatsApp aberto. Revise a mensagem e toque em enviar para concluir.");
}

function wire(): void {
  document.querySelectorAll<HTMLElement>("[data-screen]").forEach((element) => {
    element.addEventListener("click", () => {
      const next = element.dataset.screen as Screen | undefined;
      if (!next) return;
      screen = next;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((element) => {
    element.addEventListener("click", () => {
      filter = element.dataset.filter ?? "Todos";
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-book-service]").forEach((element) => {
    element.addEventListener("click", () => {
      selectedServiceId = element.dataset.bookService ?? "support";
      screen = "solicitar";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelector<HTMLButtonElement>("#mobile-menu")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const menu = document.querySelector<HTMLElement>(".desktop-nav");
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    menu?.classList.toggle("mobile-open", !expanded);
  });

  document.querySelector<HTMLSelectElement>("#service-select")?.addEventListener("change", (event) => {
    selectedServiceId = (event.currentTarget as HTMLSelectElement).value;
    const current = services.find((service) => service.id === selectedServiceId);
    const title = document.querySelector<HTMLElement>(".request-aside h2");
    const description = document.querySelector<HTMLElement>(".request-aside p");
    if (title && current) title.textContent = current.name;
    if (description && current) description.textContent = current.description;
  });

  document.querySelector<HTMLFormElement>("#service-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    submitForm(form, "service");
  });

  document.querySelector<HTMLFormElement>("#parts-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    submitForm(form, "part");
  });
}

render();
