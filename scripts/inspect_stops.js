
const fs = require('fs');

async function inspectStops() {
    const inputFile = 'd:\\Iker\\Proyectos_GitHub\\bilbotrans\\arin-main\\arin-main\\paradas_api.json';

    console.log('Reading file...');
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

    console.log('Searching for "5102" in various fields...');
    const match5102 = data.filter(s =>
        s.PARADA === '5102' ||
        s.CODIGOREDUCIDOPARADA === '5102' ||
        s.ETIQUETA_PARADA === '5102' ||
        (s.ETIQUETA_PARADA && s.ETIQUETA_PARADA.endsWith('5102'))
    );

    console.log('Found matches for 5102:', JSON.stringify(match5102, null, 2));

    console.log('\nInspecting first 2 stops of MUNICIPIO 020...');
    const bilbaoStops = data.filter(s => s.MUNICIPIO === '020').slice(0, 2);
    console.log(JSON.stringify(bilbaoStops, null, 2));
}

inspectStops();
