export type ServiceRequestMessage = {
  name: string;
  phone: string;
  service: string;
  device: string;
  details: string;
};

export type PartRequestMessage = {
  name: string;
  phone: string;
  part: string;
  device: string;
  details: string;
};

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) throw new Error("Número de WhatsApp inválido.");
  return "https://wa.me/" + normalizedPhone + "?text=" + encodeURIComponent(message.trim());
}

export function buildServiceMessage(request: ServiceRequestMessage): string {
  return [
    "Olá! Gostaria de solicitar atendimento na VIC.",
    "",
    "Nome: " + request.name.trim(),
    "Meu WhatsApp: " + request.phone.trim(),
    "Serviço: " + request.service.trim(),
    "Equipamento: " + request.device.trim(),
    "O que preciso: " + request.details.trim(),
    "",
    "Entendo que o orçamento e o atendimento dependem de avaliação."
  ].join("\n");
}

export function buildPartMessage(request: PartRequestMessage): string {
  return [
    "Olá! Gostaria de consultar uma peça na VIC.",
    "",
    "Nome: " + request.name.trim(),
    "Meu WhatsApp: " + request.phone.trim(),
    "Peça ou componente: " + request.part.trim(),
    "Equipamento: " + (request.device.trim() || "Não informado"),
    "Detalhes: " + (request.details.trim() || "Não informado"),
    "",
    "Gostaria de verificar compatibilidade, disponibilidade e orçamento."
  ].join("\n");
}
