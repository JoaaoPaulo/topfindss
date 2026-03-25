
import fetch from 'node-fetch';

async function test() {
  const url = "https://www.mercadolivre.com.br/ventilador-de-mesa-30cm-super-power-mondial-60w-vsp-30-b/p/MLB18932156";
  const mlbMatch = url.match(/MLB[-]?(\d+)/i);
  console.log("Match:", mlbMatch);
  
  if (mlbMatch) {
    const mlbId = `MLB${mlbMatch[1]}`;
    console.log("Detected ID:", mlbId);
    try {
      const res = await fetch(`https://api.mercadolibre.com/items/${mlbId}`);
      console.log("Status:", res.status);
      if (res.ok) {
        const json = await res.json();
        console.log("Title:", json.title);
      } else {
        const text = await res.text();
        console.log("Error Body:", text);
      }
    } catch (e) {
      console.log("Fetch failed:", e.message);
    }
  }
}

test();
