import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { analyzeStartup } from './services/geminiService';

const MOCK_BATCH_DATA = [
  {
    name: "Nebula AI",
    batch: "W26",
    description: "Distributed GPU cloud for fine-tuning small language models on edge devices.",
    website: "https://nebula.ai",
    ycUrl: "https://ycombinator.com/companies/nebula-ai",
    founders: [
      { name: "Alex Chen", pedigree: "Stanford CS, Ex-NVIDIA" },
      { name: "Sarah Miller", pedigree: "MIT PhD, OpenAI Research" }
    ],
    hnContext: "Highly technical discussion on HN about their custom orchestration layer. 200+ comments."
  },
  {
    name: "FlowState",
    batch: "W26",
    description: "AI-native IDE for hardware engineers (Verilog/VHDL).",
    website: "https://flowstate.io",
    ycUrl: "https://ycombinator.com/companies/flowstate",
    founders: [
      { name: "James Wu", pedigree: "IIT Madras, Ex-Apple Silicon" }
    ],
    hnContext: "Niche but very positive feedback from FPGA engineers. Moat seems to be the proprietary parser."
  },
  {
    name: "QuickCart",
    batch: "W26",
    description: "One-click checkout for headless commerce sites.",
    website: "https://quickcart.com",
    ycUrl: "https://ycombinator.com/companies/quickcart",
    founders: [
      { name: "Mike Ross", pedigree: "Serial Founder" }
    ],
    hnContext: "Skeptical comments about crowded market. Wrapper concerns."
  },
  {
    name: "SynthBio OS",
    batch: "W26",
    description: "Operating system for automated DNA synthesis labs.",
    website: "https://synthbio.io",
    ycUrl: "https://ycombinator.com/companies/synthbio",
    founders: [
      { name: "Elena Rodriguez", pedigree: "UC Berkeley BioE, Ex-Ginkgo" },
      { name: "David Park", pedigree: "CMU Robotics" }
    ],
    hnContext: "Bio-hackers are excited about the API-first approach. High technical barrier to entry."
  },
  {
    name: "VectorDB Pro",
    batch: "W26",
    description: "Ultra-low latency vector database for high-frequency trading.",
    website: "https://vectordb.pro",
    ycUrl: "https://ycombinator.com/companies/vectordb-pro",
    founders: [
      { name: "Sam Altman's Cousin", pedigree: "Ex-Jane Street" }
    ],
    hnContext: "Controversial due to the name, but benchmarks show 10x speedup over Pinecone."
  },
  {
    name: "GreenGrid",
    batch: "W26",
    description: "AI-driven demand response for municipal power grids.",
    website: "https://greengrid.energy",
    ycUrl: "https://ycombinator.com/companies/greengrid",
    founders: [
      { name: "Tom Steyer Jr", pedigree: "Harvard MBA" }
    ],
    hnContext: "Regulatory moat is strong, but technical differentiation is questioned."
  }
];

export async function seedDatabase() {
  console.log("Starting database seed...");
  
  for (const startup of MOCK_BATCH_DATA) {
    try {
      // Check if this specific startup already exists
      const q = query(collection(db, 'startups'), where('name', '==', startup.name));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        console.log(`${startup.name} already exists. Skipping.`);
        continue;
      }

      console.log(`Analyzing ${startup.name}...`);
      const analysis = await analyzeStartup(startup);
      
      await addDoc(collection(db, 'startups'), {
        ...startup,
        ...analysis,
        updatedAt: serverTimestamp(),
        hnCommentsCount: Math.floor(Math.random() * 500),
        githubStars: Math.floor(Math.random() * 2000)
      });
      console.log(`Successfully added ${startup.name}`);
    } catch (error) {
      console.error(`Error seeding ${startup.name}:`, error);
    }
  }
  console.log("Seeding complete.");
}
