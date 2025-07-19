const net = require('net');

// Datos de la última etiqueta normal que vimos
const normalLabel = {
  timestamp: new Date().toISOString(),
  counter: '0008',  // Incrementando del 0007 que vimos
  gs1: '(01)03531520010127(17)300506(10)782512600(21)0008',
  type: 'bidon',
  printed: false,
  copies: 4,
  isRfid: false,  // IMPORTANTE: Marcar como NO RFID
  originalZpl: '~JA^XA~TA000~JSN^LT0^MNW^MTT^PON^PMN^LH0,0^JMA^PR6,6~SD23^JUS^LRN^CI27^PA0,1,1,0^MMT^PW799^BY2,3,120^FO625,225^BCR,N,N,N,A^FD(01)03531520010127(17)300506(10)782512600(21)0008^FS^A0R,40,50^FO575,260^FD(01)03531520010127(17)300506(10)782512600(21)0008^FS^A0R,70,80^FO425,80^FDProd:^FS^A0R,70,80^FO425,400^FD01012^FS^A0R,50,60^FO425,850^FDBatch Number:^FS^A0R,50,60^FO425,1250^FD782512600^FS^A0R,50,60^FO325,80^FDNet Weight:^FS^A0R,50,60^FO325,400^FD1000,00 Kg^FS^A0R,50,60^FO225,400^FD2204,60 Lbs^FS^A0R,50,60^FO325,850^FDFAB:^FS^A0R,50,60^FO325,1250^FD06/05/2025^FS^A0R,50,60^FO225,850^FDEXP/VAL:^FS^A0R,50,60^FO225,1250^FD06/05/2030^FS^A0R,65,80^FO100,100^FDUFI^FS^A0R,65,70^FO100,400^FDHJA0-20UU-Q002-J25T^FS^PQ4^XZ',
  zpl: '~JA^XA~TA000~JSN^LT0^MNW^MTT^PON^PMN^LH0,0^JMA^PR6,6~SD23^JUS^LRN^CI27^PA0,1,1,0^MMT^PW799^BY2,3,120^FO625,225^BCR,N,N,N,A^FD(01)03531520010127(17)300506(10)782512600(21)0008^FS^A0R,40,50^FO575,260^FD(01)03531520010127(17)300506(10)782512600(21)0008^FS^A0R,70,80^FO425,80^FDProd:^FS^A0R,70,80^FO425,400^FD01012^FS^A0R,50,60^FO425,850^FDBatch Number:^FS^A0R,50,60^FO425,1250^FD782512600^FS^A0R,50,60^FO325,80^FDNet Weight:^FS^A0R,50,60^FO325,400^FD1000,00 Kg^FS^A0R,50,60^FO225,400^FD2204,60 Lbs^FS^A0R,50,60^FO325,850^FDFAB:^FS^A0R,50,60^FO325,1250^FD06/05/2025^FS^A0R,50,60^FO225,850^FDEXP/VAL:^FS^A0R,50,60^FO225,1250^FD06/05/2030^FS^A0R,65,80^FO100,100^FDUFI^FS^A0R,65,70^FO100,400^FDHJA0-20UU-Q002-J25T^FS^PQ4^XZ',
  id: Date.now().toString(),
  size: 716,
  barcode: '(01)03531520010127(17)300506(10)782512600(21)0008'
};

console.log('🚀 Simulando envío de etiqueta NORMAL desde ADI...');
console.log('📋 Datos de la etiqueta:', JSON.stringify(normalLabel, null, 2));

// Enviar a puerto 9100 (puerto de recepción de etiquetas)
const client = new net.Socket();
client.connect(9100, 'localhost', () => {
  console.log('📤 Conectado al servidor, enviando etiqueta...');
  
  // Simular el formato que ADI envía
  const labelData = JSON.stringify(normalLabel);
  client.write(labelData);
  client.end();
  
  console.log('✅ Etiqueta NORMAL enviada al sistema');
  console.log('🔄 Ahora puedes probar CMD 10 para ver si usa esta etiqueta');
});

client.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

client.on('close', () => {
  console.log('🔌 Conexión cerrada');
});
