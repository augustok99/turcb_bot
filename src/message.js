// module.exports = function(client) {
//     client.on('message', async (message) => {
//         if (message.body === '!ping') {
//             await client.sendMessage(message.from, 'pong');
//         }
//     });
// };


const { connectToDatabase } = require('./config/connect.js');


module.exports = function(client) {
    client.on('message', async (message) => {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;

        // Supondo que você tenha um modelo Message definido
        const Message = mongoose.model('Message', new mongoose.Schema({
            pergunta: String,
            resposta: String
        }, { collection: 'Message' })); // Especificando o nome da coleção


        // Extrair informações da mensagem
        const texto = message.body;


        // Processar a mensagem e determinar se é uma pergunta
        const isPergunta = texto.startsWith('Pergunta:');
        if (isPergunta) {
            // Remover o prefixo 'Pergunta:'
            const question = texto.substring(9);


            // Consultar o banco de dados para encontrar a resposta correspondente
            const answer = await Message.findOne({ pergunta: question });


            // Verificar se a pergunta foi extraída corretamente
            console.log(`Pergunta recebida: ${question}`);


            // Verificar se a consulta ao banco de dados retornou uma resposta
            console.log(`Resposta do banco de dados: ${answer ? answer.resposta : 'Nenhuma resposta encontrada'}`);


            // Se a resposta for encontrada, enviar a resposta
            if (answer) {
                await client.sendMessage(message.from, answer.resposta);
            } else {
                // Se a resposta não for encontrada, enviar uma mensagem padrão
                await client.sendMessage(message.from, 'Desculpe, não tenho uma resposta para essa pergunta.');
            }
        }
    });
};