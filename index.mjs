import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = '8cc0a080317f9a14d4349896a039bc91';

const ppiURL = `https://api.stlouisfed.org/fred/series/observations?series_id=WPUSI012011&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=1`;
const wageURL = `https://api.stlouisfed.org/fred/series/observations?series_id=CES2000000003&api_key=${API_KEY}&file_type=json&sort_order=desc&limit=1`;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/latest', async (req, res) => {
  try {
    const [ppiRes, wageRes] = await Promise.all([
      fetch(ppiURL),
      fetch(wageURL)
    ]);

    const ppiData = await ppiRes.json();
    const wageData = await wageRes.json();

    const ppi = parseFloat(ppiData.observations[0].value);
    const wage = parseFloat(wageData.observations[0].value);

    res.json({ ppi, wage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
app.get('/api/series', async (req, res) => {
  try {
    const start = '2006-01-01';
    const today = new Date().toISOString().split('T')[0];

    const ppiURL = `https://api.stlouisfed.org/fred/series/observations?series_id=WPUSI012011&api_key=${API_KEY}&file_type=json&observation_start=${start}&observation_end=${today}`;
    const wageURL = `https://api.stlouisfed.org/fred/series/observations?series_id=CES2000000003&api_key=${API_KEY}&file_type=json&observation_start=${start}&observation_end=${today}`;

    const [ppiRes, wageRes] = await Promise.all([fetch(ppiURL), fetch(wageURL)]);
    const ppiData = await ppiRes.json();
    const wageData = await wageRes.json();

    const wageMap = new Map(
      wageData.observations.map(o => [o.date.slice(0, 7), parseFloat(o.value)])
    );

    const output = ppiData.observations
      .filter(o => wageMap.has(o.date.slice(0, 7)))
      .map(o => ({
        date: o.date.slice(0, 7),
        ppi: parseFloat(o.value),
        wage: wageMap.get(o.date.slice(0, 7))
      }))
      .filter(entry => !isNaN(entry.ppi) && !isNaN(entry.wage));

    res.json(output);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
