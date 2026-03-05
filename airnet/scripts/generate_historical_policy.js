require('dotenv').config();
const { Op } = require('sequelize');
const { ZoneReading } = require('../models/index');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log("Analyzing historical data...");
        // Calculate the timestamp for 2 months ago
        const twoMonthsAgo = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);

        const readings = await ZoneReading.findAll({
            where: {
                ts: {
                    [Op.gte]: twoMonthsAgo
                }
            },
            raw: true
        });

        if (readings.length === 0) {
            console.log("No historical data found for the last 2 months.");
            return;
        }

        console.log(`Found ${readings.length} reading(s).`);

        // Find date range
        const minTs = Math.min(...readings.map(r => r.ts));
        const maxTs = Math.max(...readings.map(r => r.ts));

        let totalAqi = 0;
        let totalPm25 = 0;
        let totalNo2 = 0;
        let sourceCounts = {};

        readings.forEach(r => {
            totalAqi += r.aqi || 0;
            totalPm25 += r.pm25 || 0;
            totalNo2 += r.no2 || 0;
            if (r.primary_source) {
                sourceCounts[r.primary_source] = (sourceCounts[r.primary_source] || 0) + 1;
            }
        });

        const avgAqi = Math.round(totalAqi / readings.length);
        const avgPm25 = Math.round(totalPm25 / readings.length);
        const avgNo2 = Math.round(totalNo2 / readings.length);

        // Convert Unix epochs to Dates
        const startDate = new Date(minTs * 1000).toLocaleDateString();
        const endDate = new Date(maxTs * 1000).toLocaleDateString();

        let primarySource = Object.keys(sourceCounts).reduce((a, b) => sourceCounts[a] > sourceCounts[b] ? a : b, "Unknown");

        console.log(`Average AQI: ${avgAqi}`);
        console.log(`Average PM2.5: ${avgPm25}`);
        console.log(`Average NO2: ${avgNo2}`);
        console.log(`Primary source over period: ${primarySource}`);

        const prompt = `
You are an expert environmental policy advisor.
Analyze the following LONG-TERM aggregated atmospheric data for the region over a period from ${startDate} to ${endDate} (approximately 1.5 to 2 months):
- Average AQI: ${avgAqi}
- Average PM2.5: ${avgPm25} μg/m³
- Average NO2: ${avgNo2} μg/m³
- Dominant Primary Pollution Source: ${primarySource}

Based on this historical 2-month trend, generate a comprehensive, long-term policy recommendation that addresses the root causes. Avoid temporary fixes (like odd-even for a few days) and focus on sustainable policies.

Provide the response in this EXACT JSON format:
{
  "title": "[Policy title, max 80 chars]",
  "rationale": "[2-3 sentences explaining why this policy is needed based on the 2-month data trends]",
  "description": "[3-4 sentence detailed policy description with specific robust long-term actions]",
  "target_sector": "${primarySource === 'Unknown' ? 'Multi' : primarySource}",
  "projected_long_term_aqi_reduction": [integer value]
}`;

        console.log("\nQuerying Gemini API...");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No GEMINI_API_KEY found in environment variables.");
            return;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
                })
            }
        );

        const json = await response.json();

        const errorPath = path.join(__dirname, '../policy_error.txt');
        fs.writeFileSync(errorPath, "HTTP STATUS: " + response.status + "\\nRAW JSON:\\n" + JSON.stringify(json, null, 2));

        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.replace(/```json|```/g, '').trim();

        const policyData = JSON.parse(cleaned);

        const outputPath = path.join(__dirname, '../policy_output.txt');
        const output = `=================== POLICY SUGGESTION ===================\n` + JSON.stringify(policyData, null, 2);
        fs.writeFileSync(outputPath, output);
        console.log("Successfully wrote policy to policy_output.txt");

    } catch (e) {
        const errorPath = path.join(__dirname, '../policy_error.txt');
        fs.appendFileSync(errorPath, "\n\nCRASH:\n" + (e.stack || e.message));
        console.error("Error generating policy, details saved to policy_error.txt");
    }
}

main();
