// Arquivo de configuração de e-mail (SMTP)
// Atenção: este arquivo pode conter credenciais sensíveis. Em produção recomenda-se
// usar variáveis de ambiente ou um cofre de segredos. Este arquivo existe apenas
// para facilitar configuração local conforme solicitado.

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

// Carrega valores do ambiente Vite (variáveis prefixadas com VITE_)
// Para uso local, crie um arquivo .env.local com as chaves abaixo:
// VITE_SMTP_HOST=smtp.gmail.com
// VITE_SMTP_PORT=587
// VITE_SMTP_USER=seu-email@exemplo.com
// VITE_SMTP_PASSWORD=seu-token-ou-senha
// Observação: variáveis de ambiente no frontend são embutidas no bundle e podem
// ser visíveis no cliente — para credenciais sensíveis, prefira um backend.

const emailConfig: EmailConfig = {
  smtpHost: (import.meta.env.VITE_SMTP_HOST as string) || undefined,
  smtpPort: import.meta.env.VITE_SMTP_PORT ? Number(import.meta.env.VITE_SMTP_PORT) : undefined,
  smtpUser: (import.meta.env.VITE_SMTP_USER as string) || undefined,
  smtpPassword: (import.meta.env.VITE_SMTP_PASSWORD as string) || undefined,
};

export default emailConfig;
