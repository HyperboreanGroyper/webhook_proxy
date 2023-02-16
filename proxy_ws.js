const { createServer } = require('http');
const { parse } = require('url');
const { WebSocketServer } = require('ws');
const express = require('express')
const app = express()
const https = require('https')
const bunyan = require('bunyan')

// logs
const log = bunyan.createLogger({
    name: 'node.js_ws_srv',
    streams: [
      {
        level: 'info',
        path: './connect.log'                                                    // log INFO and above to stdout
      }, 
      
      {
        level: 'error',
        path: './error.log'                                                      // log error
      }
    ]
  });

//============================= end of logs =============================



const server = createServer();
const wsin = new WebSocketServer({ noServer: true });
const wsout = new WebSocketServer({ noServer: true });

let MAP = {}
const host = '0.0.0.0'                                                            // GET MAP addr 0.0.0.0 for any
const port = 8889                                                                 // GET MAP port

const ports = 8888                                                                                        // socket port
    

const mainfunc = async () => {

  // Input interface
wsin.on('connection', (ws, req) => {
    var address = req.socket.remoteAddress                                         //getting ip addresses of clients
    
    ws.onmessage = function (message) {                                            // getting message
      try {
      var json = JSON.parse(message.data) 
      var keys = Object.keys(json)

      for (var i = 0; i < keys.length; i++) {                                      // changing MAP Array
        if (json[keys[i]] != '' ) {
          MAP[keys[i]] = `"${json[keys[i]]}"`
        
        } else {
          delete MAP[keys[i]]
        }
        
      }

    wsout.clients.forEach(client => {                                                 // broadcasting to all /out clients whith MAP
      try{
      const sendmsgfunc = async (json) => {
        client.send(JSON.stringify(json))
  }
    
      if (client !=ws) {  
        const broadcastfunc = async () => {
          await sendmsgfunc(json)
       }
          broadcastfunc();
      }
    } catch (err) {
      log.error(err)
    }
     })



    } catch (err) {
      log.error(err)
    }
      }

      log.info(`Client connected to /in interface whith address ${address}`)
      ws.on('close', function() {
        MAP = {}
      })
  })

//============================= end of Input interface =============================

// Output interface

wsout.on('connection', (ws, req) => {
    try {
    var address = req.socket.remoteAddress                                           //getting ip addresses of clients
    //https.get(`https://auth.servercheck_key.php?${message}`, (res) => {
        https.get(`https://encrypted.google.com/`, (res) => {
            if (res.statusCode === 301) {
                ws.send(JSON.stringify(MAP))
      
              log.info(`Client connected to /out interface whith address ${address}`)
      
            } else {
              
                log.info(`Client not authenticated whith /out interface whith address ${address}`)
      
              ws.close()
            }
            
          })
        } catch (err) {
            log.error(err)
        }
})
// Получаем сообщеие от клиента (возможно нужно условие проверки времени, уточнить)
// шлём на сервер авторизации
// если ок = держим конект
// если не ок = рвём
//============================= end of Output interface =============================

app.use(express.static(__dirname))
  
//получение MAP
app.get('/getmap', (req, res) => {
  res.send(MAP)
})


//handlers for in\out namespaces
server.on('upgrade', function upgrade(request, socket, head) {
  const { pathname } = parse(request.url);

  if (pathname === '/in') {                                                                               // input information socket handler
    wsin.handleUpgrade(request, socket, head, function done(ws) {
      wsin.emit('connection', ws, request);
    });
  } else if (pathname === '/out') {                                                                       // output messages socket handler
    wsout.handleUpgrade(request, socket, head, function done(ws) {
      wsout.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});
//============================= end of handlers for in\out namespaces =============================

server.listen(ports);                                                                            
}

mainfunc()

app.listen(port, host, () =>
  console.log(`GET app listening at http://${host}:${port}/getmap`, '\n', 
  `socket listening at http://${host}:${ports}`
  )
)
