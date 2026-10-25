// Usado no "ng serve" (desenvolvimento na sua máquina)
export const environment = {
  production: false,

  // Vazio = a API é chamada no MESMO endereço do site
  // (ex.: /api/pedidos). O "ng serve" encaminha para a API .NET
  // pelo proxy.conf.json. Assim funciona tanto em localhost
  // quanto pelo link do túnel (Cloudflare) no celular.
  apiUrl: ''
};
