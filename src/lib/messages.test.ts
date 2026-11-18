import { describe, expect, it } from "vitest";
import { buildPartMessage, buildServiceMessage, buildWhatsAppUrl } from "./messages";

describe("mensagens do atendimento", () => {
  it("monta a solicitação de serviço com os dados informados", () => {
    const message = buildServiceMessage({
      name: "Ana",
      phone: "(46) 99999-1234",
      service: "Instalação de SSD",
      device: "Acer Aspire 5",
      details: "Quero instalar um SSD de 480 GB."
    });

    expect(message).toContain("Nome: Ana");
    expect(message).toContain("Serviço: Instalação de SSD");
    expect(message).toContain("Equipamento: Acer Aspire 5");
  });

  it("monta a consulta de peça sem inventar dados ausentes", () => {
    const message = buildPartMessage({
      name: "João",
      phone: "46999991234",
      part: "Memória DDR4",
      device: "",
      details: ""
    });

    expect(message).toContain("Peça ou componente: Memória DDR4");
    expect(message).toContain("Equipamento: Não informado");
    expect(message).toContain("Detalhes: Não informado");
  });

  it("normaliza o número e codifica a mensagem no link do WhatsApp", () => {
    const url = new URL(buildWhatsAppUrl("+55 (46) 99999-1234", "Olá, VIC!"));
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/5546999991234");
    expect(url.searchParams.get("text")).toBe("Olá, VIC!");
  });

  it("rejeita número sem dígitos", () => {
    expect(() => buildWhatsAppUrl("abc", "Mensagem")).toThrow("Número de WhatsApp inválido.");
  });
});
