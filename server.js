
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const salas = {};

io.on("connection", (socket) => {
  console.log("Jogador conectado:", socket.id);

  socket.on("partida-publica", () => {
    let sala = Object.keys(salas).find(
      id => salas[id].publica && salas[id].jogadores.length < 10
    );

    if (!sala) {
      sala = "publica-" + Date.now();
      salas[sala] = {
        publica: true,
        jogadores: []
      };
    }

    entrarNaSala(socket, sala);
  });

  socket.on("criar-sala", () => {
    const codigo = Math.random().toString(36)
      .substring(2, 8).toUpperCase();

    salas[codigo] = {
      publica: false,
      jogadores: []
    };

    entrarNaSala(socket, codigo);
    socket.emit("sala-criada", codigo);
  });

  socket.on("entrar-sala", (codigo) => {
    codigo = String(codigo).toUpperCase();

    if (!salas[codigo] || salas[codigo].jogadores.length >= 10) {
      socket.emit("erro-sala", "Sala inexistente ou cheia!");
      return;
    }

    entrarNaSala(socket, codigo);
  });

  function entrarNaSala(socket, codigo) {
    socket.join(codigo);
    salas[codigo].jogadores.push(socket.id);

    socket.emit("entrou-sala", {
      codigo,
      jogadores: salas[codigo].jogadores.length
    });

    io.to(codigo).emit(
      "jogadores-atualizados",
      salas[codigo].jogadores.length
    );
  }

  socket.on("disconnect", () => {
    for (const codigo in salas) {
      salas[codigo].jogadores =
        salas[codigo].jogadores.filter(id => id !== socket.id);

      if (salas[codigo].jogadores.length === 0) {
        delete salas[codigo];
      } else {
        io.to(codigo).emit(
          "jogadores-atualizados",
          salas[codigo].jogadores.length
        );
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("Servidor Ilha Zenite Online!");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Ilha Zenite rodando na porta " + PORT);
});
            
