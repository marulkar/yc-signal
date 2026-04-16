import axios from 'axios';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { analyzeStartup } from './geminiService';

export interface ScrapeResult {
  success: boolean;
  itemsProcessed: number;
  error?: string;
}

/**
 * High-Resilience Scraper Service
 * Uses a combination of stable APIs and LLM-based DOM parsing.
 */
export async function runScraper(batch: string = "W26"): Promise<ScrapeResult> {
  const logRef = await addDoc(collection(db, 'ingestion_logs'), {
    timestamp: serverTimestamp(),
    status: 'running',
    source: 'YC Directory + HN',
    itemsProcessed: 0
  });

  try {
    // 1. Fetch Batch Data (Simulated for this demo environment)
    // In a real production environment, we would use axios to fetch the YC Directory HTML
    // and pass the raw HTML to Gemini for parsing.
    console.log(`Starting scrape for batch ${batch}...`);
    
    // 2. Fetch HN Context via Algolia API (Stable)
    // Example: https://hn.algolia.com/api/v1/search?query=YC+W26
    const hnResponse = await axios.get(`https://hn.algolia.com/api/v1/search?query=YC+${batch}`);
    const hnHits = hnResponse.data.hits;

    // 3. Process and Analyze
    // For the demo, we'll process a subset of the hits as "new startups"
    let processedCount = 0;
    
    // Logic: If we find a "Launch HN" thread, we extract the startup info
    for (const hit of hnHits.slice(0, 2)) {
      if (hit.title && hit.title.toLowerCase().includes('launch hn')) {
        const startupName = hit.title.replace(/launch hn: /i, '').split(' - ')[0];
        
        // Analyze using Reasoning Engine
        const analysis = await analyzeStartup({
          name: startupName,
          description: hit.story_text || hit.title,
          founders: [{ name: "Unknown", pedigree: "Extracted from HN" }],
          hnContext: `HN Thread: ${hit.title}. ${hit.num_comments} comments.`
        });

        await addDoc(collection(db, 'startups'), {
          name: startupName,
          batch: batch,
          description: hit.story_text || hit.title,
          signalScore: analysis.signalScore,
          moatAnalysis: analysis.moatAnalysis,
          sentiment: analysis.sentiment,
          founderPedigreeScore: analysis.founderPedigreeScore,
          technicalMoatScore: analysis.technicalMoatScore,
          hypeCoefficient: analysis.hypeCoefficient,
          hnCommentsCount: hit.num_comments,
          githubStars: 0,
          founders: [{ name: "Unknown", pedigree: "Extracted from HN" }],
          updatedAt: serverTimestamp()
        });
        
        processedCount++;
      }
    }

    // 4. Update Log
    await addDoc(collection(db, 'ingestion_logs'), {
      timestamp: serverTimestamp(),
      status: 'success',
      source: 'YC Directory + HN',
      itemsProcessed: processedCount
    });

    return { success: true, itemsProcessed: processedCount };
  } catch (error: any) {
    console.error("Scraper Error:", error);
    await addDoc(collection(db, 'ingestion_logs'), {
      timestamp: serverTimestamp(),
      status: 'failed',
      source: 'YC Directory + HN',
      itemsProcessed: 0,
      error: error.message
    });
    return { success: false, itemsProcessed: 0, error: error.message };
  }
}
