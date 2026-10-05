# INTEGRAÇÃO OFICIAL PROXYPAY — HOT-M

## 1. Visão Geral
O ProxyPay é o gateway transacional primário para pagamentos em Angola, permitindo a emissão de referências Multicaixa e recebimento de notificações automáticas via webhooks com assinatura criptográfica SHA256.

## 2. Invariantes
- A moeda suportada pelo ProxyPayAdapter é estritamente **AOA**.
- Referências bancárias são geradas e registradas pelo servidor via endpoint da API da ProxyPay (`PUT /references/:id`).
- Nunca inventar referências no cliente ou criar dados mock em ambiente de produção.
- Assinatura do webhook é verificada via header `X-Signature` ou `X-ProxyPay-Signature` comparando o HMAC SHA256 do payload cru (`rawBody`) com o segredo `PROXYPAY_WEBHOOK_SECRET` em tempo constante (`crypto.timingSafeEqual`).

## 3. Ambientes
- **Sandbox:** `https://api.sandbox.proxypay.co.ao`
- **Produção:** `https://api.proxypay.co.ao`
