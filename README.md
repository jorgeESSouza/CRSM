# CoreRelateSciMiner (CRSM) 🧬📊

**CoreRelateSciMiner (CRSM)** is a React-based scientific literature text-mining application. It uses the [OpenAlex](https://openalex.org/) API to fetch scientific articles and validate the co-occurrence of terms and keywords by applying rigorous statistical tests, separating real biological/clinical signals from bibliographical noise.

## 🎯 Why use CRSM?

Traditional search engines (like PubMed or Google Scholar) show you how many articles contain your terms, but they do not tell you if the association between them is **statistically significant** or just random chance. CRSM solves this by introducing **Control Groups** and applying direct statistical tests to the exact co-occurrence of terms within the **Title and Abstract** of the articles.

## 📥 Inputs and Filters

To perform an accurate data mining session, the tool requires three groups of keywords (comma-separated). It evaluates Exact Matches only.

### 1. Target Keywords (Primary Variables)

The main terms of your research. What you actually want to discover if it's connected.

*   **Important Constraint:** The application accepts **2 to 4 terms**. Do not exceed this limit to maintain statistical graph accuracy.
*   **Example:** `TP53, BRCA1, breast cancer, mutation`.

### 2. Positive Control

Words that are **known** to have a strong relationship with each other and with your field of study.

*   **Purpose:** Sets the "high baseline." It helps calibrate what a true, strong association looks like numerically in your sample.
*   **Example:** `gene, dna, expression, clinical`.

### 3. Negative Control

Generic words that are **completely unrelated** to your topic.

*   **Purpose:** Sets the "noise baseline." If your Target Keywords have metrics similar to these terms, your association is likely a false positive (random chance/noise).
*   **Example:** `galaxy, medieval, astronomy, poetry`.

### 🎛️ Advanced Filters

*   **Since Year & Min Citations:** Filter for recent articles or those with high scientific impact.
*   **Article Type:** Choose to focus only on original papers (`Original Research`) or reviews (`Review`).
*   **Open Access:** Check this to only fetch freely available articles.
*   **Max Articles:** Choose the sample size (100 to 1000). Larger samples take longer but provide better statistical reliability.

## 🧮 Statistical Indices & Cut-offs

CRSM applies classical statistical tests to validate the pairs. Here is how to interpret the numbers on the **Statistics** tab:

### 1. Z-Score (Noise Validation)

Compares the frequency of each found pair against the baseline of random co-occurrences (the Negative Control).

*   **> 1.96:** **SIGNIFICANT** (p < 0.05). The association is well above random noise.
*   **< 1.96:** **NOISE**. The association is statistically indistinguishable from random chance.

### 2. Jaccard Index (Similarity)

Measures the exclusivity of the co-occurrence. It asks: "When one word appears, how often does the other appear with it, ignoring the rest of the universe?" (Scale 0 to 1).

*   **≥ 0.10:** **HIGH** similarity. Excellent overlap for text mining.
*   **≥ 0.05:** **MODERATE** similarity. A relevant scientific overlap.
*   **< 0.05:** **LOW** similarity. The words rarely share the same specific context.

### 3. Odds Ratio (Association Strength)

Indicates how many times the chance of Word B appearing increases if Word A is present in the text. (Calculated with Haldane-Anscombe correction, defaulting to 0.00000 if no actual co-occurrence exists).

*   **> 1.5:** **STRONG** association.
*   **> 1.0:** **POSITIVE** association.
*   **≤ 1.0:** **WEAK/NONE**. The terms appear independently.

## 💡 Practical Example & Tips

**Scenario:** You want to know if a specific diet affects a specific disease.

*   **Target Keywords:** `keto diet, intermittent fasting, type 2 diabetes` (Remember: 2 to 4 terms max).
*   **Positive Control:** `blood sugar, glucose, metabolic, weight loss`.
*   **Negative Control:** `quantum physics, tectonic plates, cryptocurrency, medieval history`.

**Golden Tips for better results:**

1.  **Use Exact Phrasing:** The algorithm searches for exact matches. `mutation` is different from `mutations`.
2.  **Start Small:** Use 100 or 250 articles first to test your keywords. Once you refine them, run the 1000 limit for robust statistics.
3.  **Trace the Source:** Every number in the Statistics and Target tabs is a clickable link. Click them to open a modal showing exactly which articles contain that specific keyword intersection.

*Built for researchers, data scientists, and curious minds.*