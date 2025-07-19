/**
 * Script de debugging para updateCounterInZpl
 * Objetivo: Verificar por qué no se actualizan los contadores del PLC
 */

// Importar la función (ruta del IOT2050)
const { updateCounterInZpl } = require('./src/utils/zpl-utils');

console.log('🧪 TESTING updateCounterInZpl FUNCTION\n');

// Caso 1: ZPL simple con (21)0001
console.log('📋 TEST 1: ZPL básico');
const testZpl1 = "~JA^XA^FD(01)03531520010127(17)300506(10)782512600(21)0001^FS^XZ";
console.log('   ZPL original:', testZpl1);
console.log('   Contiene (21)0001:', testZpl1.includes('(21)0001'));

const updated1 = updateCounterInZpl(testZpl1, '1234');
console.log('   ZPL actualizado:', updated1);
console.log('   Contiene (21)1234:', updated1.includes('(21)1234'));
console.log('   ¿Cambió?:', testZpl1 !== updated1);

// Caso 2: ZPL real de etiqueta guardada
console.log('\n📋 TEST 2: ZPL de etiqueta real');
try {
  const fs = require('fs');
  const labels = JSON.parse(fs.readFileSync('./labels.json', 'utf8'));
  
  if (labels.length > 0) {
    const realLabel = labels[0];
    console.log('   ID etiqueta:', realLabel.id);
    console.log('   Tipo:', realLabel.type);
    console.log('   ZPL original (primeros 200 chars):', realLabel.zpl.slice(0, 200) + '...');
    console.log('   Contiene (21):', realLabel.zpl.includes('(21)'));
    console.log('   Contiene (21)0001:', realLabel.zpl.includes('(21)0001'));
    
    // Buscar todas las ocurrencias de (21)
    const gs1Matches = realLabel.zpl.match(/\(21\)(\d{4})/g);
    console.log('   Patrones (21) encontrados:', gs1Matches);
    
    const updated2 = updateCounterInZpl(realLabel.zpl, '9999');
    console.log('   ¿ZPL cambió después de updateCounterInZpl?:', realLabel.zpl !== updated2);
    
    if (realLabel.zpl !== updated2) {
      console.log('   ✅ updateCounterInZpl SÍ funciona');
      // Buscar (21)9999 en resultado
      console.log('   Contiene (21)9999:', updated2.includes('(21)9999'));
    } else {
      console.log('   ❌ updateCounterInZpl NO modificó el ZPL');
    }
  } else {
    console.log('   ⚠️  No hay etiquetas en labels.json');
  }
} catch (error) {
  console.log('   ❌ Error leyendo labels.json:', error.message);
}

// Caso 3: Test de regex manualmente
console.log('\n📋 TEST 3: Regex manual');
const regex = /\(21\)(\d{4})/g;
const testString = "(01)03531520010127(17)300506(10)782512600(21)0001";
console.log('   String test:', testString);
console.log('   Regex matches:', testString.match(regex));
console.log('   Replace test:', testString.replace(regex, '(21)8888'));

console.log('\n🎯 CONCLUSIONES:');
console.log('   1. Si TEST 1 funciona → La función está bien');
console.log('   2. Si TEST 2 falla → El ZPL real tiene formato diferente');
console.log('   3. Si TEST 3 funciona → El regex está bien');
console.log('\n🔚 FIN DEL DEBUGGING'); 