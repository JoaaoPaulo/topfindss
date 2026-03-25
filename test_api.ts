
import fetch from 'node-fetch';

async function test() {
  const ids = ["MLB19603205", "MLB18932156"];
  for (const id of ids) {
    console.log(`Testing ${id}...`);
    try {
      const res = await fetch(`https://api.mercadolibre.com/items/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`Title: ${json.title}`);
        console.log(`Pictures: ${json.pictures?.length || 0}`);
      } else {
        console.log(`Error: ${await res.text()}`);
      }
    } catch (e) {
      console.log(`Fetch Error: ${e.message}`);
    }
    console.log('---');
  }
}

test();
