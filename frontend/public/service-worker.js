// roda em uma thread separada da ui, nao tem acesso a dom, roda separado do navegador. nao pode acessar api especifica do browser
// VAMOS USAR A PUSH MANAGER
//https://developer.mozilla.org/en-US/docs/Web/API/PushManager

/*
1º passo: Instalar a biblioteca web push no backend - npm i web-push para trabalhar com essa biblioteca do lado do backend
*/

self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'PUSH', body: 'DETALHES' };
    const options = {
      body: data.body,
      icon: 'icon.png',
      badge: 'badge.png'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  });
  