// module.exports = function(client) {
//     client.on('message', async (message) => {
//         if (message.body === '!ping') {
//             await client.sendMessage(message.from, 'pong');
//         }
//     });
// };

const { connectToDatabase } = require("./config/connect.js");

module.exports = function (client) {
    client.on("message", async (message) => {
      const mongoose = await connectToDatabase();
  
      let MessageModel;

    // verifica se tem uma collection chamadada "Message", se não houver faça uma nova collection
    if (mongoose.models.Message) {
        MessageModel = mongoose.model("Message");
      } else {
        MessageModel = mongoose.model(
          "Message",
          new mongoose.Schema(
            {
              phoneNumber: String,
              question: String,
              answer: String,
              isNewUser: { type: Boolean, default: true },
            },
            { collection: "Message" }
          )
        );
      }
    

    // Verificar se o usuário é novo
    const userMessage = await MessageModel.findOne({ phoneNumber: message.from });

    if (userMessage) {
      // Enviar mensagem de boas-vindas
      userMessage.isNewUser = false;
      await userMessage.save();
    }else {
        // O usuário é novo, crie um novo documento
        const newUserMessage = new MessageModel({
            phoneNumber: message.from,
            // Preencha os outros campos conforme necessário
            // Por exemplo, você pode inicializar pergunta e resposta como strings vazias
            question: "",
            answer: "",
            // O campo isNewUser já está definido como true por padrão no esquema
        });
        await newUserMessage.save();
        await client.sendMessage(message.from, 'Olá! Bem-vindo ao nosso serviço. Como posso ajudá-lo hoje?');
    }
    // Extrair informações da mensagem
    const text = message.body;

    // Processar a mensagem e determinar se é uma pergunta
    const is_question = text.startsWith("Pergunta:");
    if (is_question) {
      // Remover o prefixo 'Pergunta:'
      const question_text = text.substring(9);

      // Consultar o banco de dados para encontrar a resposta correspondente
      const answer_message = await MessageModel.findOne({ question: question_text });

      // Verificar se a pergunta foi extraída corretamente
      console.log(`Pergunta recebida: ${question_text}`);

      // Verificar se a consulta ao banco de dados retornou uma resposta
      console.log(
        `Resposta do banco de dados: ${
          answer_message ? answer_message.answer : "Nenhuma resposta encontrada"
        }`
      );

      // Se a resposta for encontrada, enviar a resposta
      if (answer_message) {
        await client.sendMessage(message.from, answer_message.answer);
      } else {
        // Se a resposta não for encontrada, enviar uma mensagem padrão
        await client.sendMessage(
          message.from,
          "Desculpe, não tenho uma resposta para essa pergunta."
        );
      }
    }
  });
};
