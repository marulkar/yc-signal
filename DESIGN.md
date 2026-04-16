# The YC Signal: Project Design Document

## 1. Executive Summary
**The YC Signal** is a high-fidelity startup evaluation engine designed to filter the "noise" of Y Combinator batches. It uses Large Language Models (Gemini 1.5 Pro) to perform deep-tech moat analysis, founder pedigree mapping, and sentiment tracking across developer communities (HN, X, GitHub).

## 2. System Architecture

### 2.1 Data Ingestion Layer (The Scraper)
*   **Source A: YC Directory** - Primary source for company names, descriptions, and founder links.
*   **Source B: Hacker News (Algolia API)** - Used to fetch community sentiment and launch thread discussions.
*   **Source C: GitHub API** - Used to track repository velocity and "Technical Moat" indicators.
*   **Resilience Strategy**: We use **LLM-based DOM Parsing**. Instead of rigid CSS selectors, we pass raw HTML fragments to Gemini to extract structured data. This ensures the scraper survives UI changes.

### 2.2 Intelligence Layer (Reasoning Engine)
*   **Model**: Gemini 1.5 Pro.
*   **Input**: Aggregated raw data from the Ingestion Layer.
*   **Output**: Structured "Signal Score" (0-100) based on a weighted formula:
    *   `Technical Moat (40%)`
    *   `Founder Pedigree (30%)`
    *   `Market Sentiment (30%)`
    *   `Hype Penalty`: Applied if social noise exceeds technical substance.

### 2.3 Persistence Layer (Database)
*   **Technology**: Google Firestore (NoSQL).
*   **Collections**:
    *   `startups`: Stores the analyzed intelligence.
    *   `users`: Stores user preferences and watchlists.
    *   `ingestion_logs`: Tracks scraper progress and failures.

## 3. Future Proofing & "Forever" Strategy

### 3.1 API vs. Scraping
*   **API Dependency**: We prefer official APIs (Algolia, GitHub) for stability.
*   **The "Shutdown" Scenario**: If YC restricts access, the system automatically switches to **Headless Browser Ingestion**. 
*   **Decoupled Logic**: The "Analysis" logic is separate from "Ingestion." Even if the source format changes, the Reasoning Engine remains effective as long as it can "read" the text.

### 3.2 Data Sovereignty
By persisting all analyzed data in Firestore, we build a historical archive. Even if a startup deletes their YC profile, our "Signal Snapshot" remains as a permanent record for investors.

## 4. Roadmap
1.  **Phase 1 (Current)**: UI/UX & Mock Data Calibration.
2.  **Phase 2**: Automated Scraper Integration (HN + YC).
3.  **Phase 3**: Real-time "Signal Alerts" via Email/Slack.
4.  **Phase 4**: Portfolio Tracking for VC users.
