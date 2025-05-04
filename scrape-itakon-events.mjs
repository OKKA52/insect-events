import axios from 'axios';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

console.log('✅ SUPABASE_URL =', process.env.SUPABASE_URL);
console.log('✅ SUPABASE_KEY =', process.env.SUPABASE_KEY ? '[OK]' : '[MISSING]');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('❌ SUPABASEの環境変数が不足しています。');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const MUSEUM_ID = 'f58d41b3-f940-439c-b7c7-70c73d108cea';
const url = 'https://www.itakon.com/news/events';

const cleanText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<br\s*\/?>(\n)?/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
};

const normalizeForComparison = (text) => {
  return text
    .replace(/[\s\n\r\t　、。,．.・･!-]/g, '')
    .normalize('NFKC')
    .toLowerCase();
};

const removeDuplicateSentences = (text) => {
  const sentences = text.split(/(?<=[。！？])\s*/);
  const seen = new Set();
  const result = [];

  for (const sentence of sentences) {
    const norm = normalizeForComparison(sentence);
    if (!seen.has(norm) && norm.length > 3) {
      seen.add(norm);
      result.push(sentence.trim());
    }
  }
  return result.join(' ');
};

const parseDates = (text) => {
  const match = text.match(/(\d{1,2})月(\d{1,2})日/g);
  if (!match) return [null, null];
  const year = new Date().getFullYear();
  const toDate = (m) => {
    const parts = m.match(/(\d{1,2})月(\d{1,2})日/);
    if (!parts) return null;
    const [, month, day] = parts;
    return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
  };
  return [toDate(match[0]), match[1] ? toDate(match[1]) : toDate(match[0])];
};

const fetchEvents = async () => {
  const res = await axios.get(url);
  fs.writeFileSync('itakon-debug.html', res.data, 'utf-8');

  const $ = load(res.data);
  const events = [];
  let currentEvent = null;

  const rows = $('tr');
  rows.each((i, el) => {
    const columns = $(el).find('td');
    if ($(columns[0]).attr('rowspan')) return;

    if (columns.length >= 2) {
      const dateText = cleanText($(columns[0]).text());
      const title = cleanText($(columns[1]).find('strong').text());
      const event_url = url;
      const [start_date, end_date] = parseDates(dateText);

      const descCell = columns.length === 3 ? columns[2] : columns[1];
      const base_description_raw = $(descCell).clone().find('img, a').remove().end().text();

      const nextRow = $(el).next('tr');
      const extraText_raw = nextRow.find('td, span').clone().find('img, a').remove().end().text();

      const normalizedBase = cleanText(base_description_raw);
      const normalizedExtra = cleanText(extraText_raw);

      let merged = normalizedBase;
      if (normalizedExtra && !normalizeForComparison(normalizedBase).includes(normalizeForComparison(normalizedExtra))) {
        merged += '\n' + normalizedExtra;
      }

      const final_description = removeDuplicateSentences(merged);

      if (title && start_date) {
        currentEvent = {
          title,
          museum_id: MUSEUM_ID,
          start_date,
          end_date,
          event_description: final_description,
          event_url,
        };
        events.push(currentEvent);
      }
    } else if (columns.length === 1 && currentEvent) {
      const raw = $(columns[0]).clone().find('img, a').remove().end().text();
      const cleaned = cleanText(raw);

      const newCombined = currentEvent.event_description + '\n' + cleaned;
      currentEvent.event_description = removeDuplicateSentences(newCombined);
    }
  });

  return events;
};

const saveToSupabase = async (events) => {
  for (const event of events) {
    const { error } = await supabase
      .from('events')
      .upsert(event, { onConflict: ['museum_id', 'title'] });

    if (error) {
      console.error('❌ Error saving:', event.title, error.message);
    } else {
      console.log('✅ Saved:', event.title);
    }
  }
};

const main = async () => {
  const events = await fetchEvents();
  console.log(`📦 ${events.length} 件のイベントを取得`);
  await saveToSupabase(events);
};

main();
