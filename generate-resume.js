#!/usr/bin/env node
// generate-resume.js — Tailors resume using Claude Haiku
// Usage: node generate-resume.js --auto      (score>=70 jobs without resume)
//        node generate-resume.js <job_id>    (specific job)

const fs   = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const jobsPath    = path.join(__dirname, 'jobs.json');
const templatePath= path.join(__dirname, 'resume-template.html');
const resumesDir  = path.join(__dirname, 'resumes');

if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

// ── Base resume content (for Claude context only) ──
const BASE_RESUME = `
SUMMARY
Product leader with deep expertise in advertising platforms, AI-powered data products, growth systems, and B2C experiences across travel, e-commerce, and telecom. Builds high-impact consumer- and advertiser-facing products—including ad platforms serving 20K+ customers (scaling to 1M+ ads), bot-intelligence systems with 99% visibility, and measurement platforms that accelerate decision velocity. Leads cross-functional teams from 0-to-1 through enterprise scale, modernizing data pipelines, improving AI/ML signal quality, and solving complex system-level challenges. Recognized for translating ambiguous problems into actionable strategies and delivering 23–30% gains in accuracy, efficiency, and adoption.

EXPERIENCE
Product Manager | Expedia (04/2023 – till date)
- Launched two foundational SEO intelligence products (COBALT, URL DIM), reducing weekly trading analysis from hours to minutes.
- Resolved long-standing ambiguous “SEO Dark” issues by challenging legacy assumptions, improving metric accuracy by 23%.
- Built an AI‑driven search‑engine discovery and evaluation system using Claude Code, cutting analysis time from a full day to minutes (99%+ efficiency gain), and accelerating integration of new search engines.
- Led end‑to‑end development of BOTMOBILE, a bot‑detection and analytics platform providing 99% visibility into crawler behavior, enabling accurate experiment readouts, and preventing 30% of good‑bot blockages.
- Built the business case demonstrating that link sharing drives ~10% of direct traffic, securing executive investment for attribution improvements.
- Led org-wide shift from Visits → Entry Clicks for traffic measurement, delivering a more accurate behavioral signal for attribution and AI/ML models and significantly increasing trust in the underlying data.
- Modernized data pipelines—including GSC BigQuery ingestion, canonical intelligence, and taxonomy v4—improving signal quality, enabling stronger AI‑driven recommendations and classification, and strengthening trust in downstream AI systems.
- Revitalized a neglected direct channel by identifying multi‑million‑dollar leakage‑related inflation and directing traffic reallocation to the appropriate channels, significantly strengthening attribution accuracy.

Product Manager | Microsoft (12/2020 – 05/2022)
- Product Manager for search ads product (Dynamic search ads, Responsive search ads & Multimedia ad extension, built various features from concept till GA (Global Availability) to help advertiser reduce ad creation time & effort by ~5%.
- Launched Facebook import open beta for 40+ managed and 20k unmanaged customers with zero issues to enable advertiser to get the rich demand containing images and videos from Facebook.
- Successfully completed DSA Campaign type deprecation and migration to Mixed mode campaign, helping remove barriers to DSA adoption, saved time by eliminating redundant operations and increasing Mixed mode campaign by 30% within a quarter.
- Delivered DSA deprecation and migration to Mixed Campaign mode, increasing Mixed Mode campaign adoption by 30% in one quarter.
- Accomplished the target of 1M ads within 3 months of soft launch of Multimedia ad, differentiator from Microsoft to enhance advertiser brand value with large visual imagery and video to showcase brand and product to increase traffic.
- Led development of key Multimedia Ads features (CTA, bid modifiers, multi-asset models, logo support, previews) across the entire product lifecycle.

Product Manager | EBAY (09/2019 – 02/2020)
- Received the ‘You Made My Day Award’ for agile process implementation and enhancement of Extended Identifiers and ECDL within 4 weeks of joining.
- Inherited a delayed eBay data-product launch and shipped MVP in 6 weeks by refining roadmap & priorities.
- Championed Data Product (ECDL - eBay Common data layer) to provide easy availability of streaming ecommerce data (Big Data), and aggregation of data in self-serve manner to analytics, Machine Learning (ML) for actionable insights.

Product Manager | MOODY’S ANALYTICS (06/2019 – 09/2019)
- Improved product delivery by 20% by implementing new agile processes and facilitating core ceremonies to enhance team alignment and velocity.
- Drove clarity and alignment by gathering 100% of stakeholder requirements and managing expectations for the control plane. Built and continuously refined the product roadmap and PRDs to guide high‑value delivery.

Product Manager | T-MOBILE (06/2017 – 06/2019)
- Developed and executed the product vision and strategy, driving a 15% increase in delivery speed through clear communication and team alignment. Recognized as Star Performer for increasing product adoption by 20%.
- Decreased shipping issues and related costs by 30% through a data‑driven analysis of the shipping workflow and creation of a streamlined process flow.
- Cut ticket return rates to 10% by strengthening product functionality with accurate, current requirements—driving a more consistent and user‑friendly experience.

Product Manager | TECH MAHINDRA (11/2014 – 06/2019)
- As Part of Makers Lab conceptualized innovative products using Machine Learning and Artificial Intelligence to help change market perception.
- Consulted on strategy formulation for various Digital Enterprise and Transformation Services; conducted market research for business case development, Total Cost of Ownership (TCO) and Return On Investment (ROI) analysis, and strategy formulation.

RELEVANT CAREER HISTORY
CML Consultant | CYBERTECH SYSTEM and SOFTWARE LIMITED INC | 09/2012 – 11/2014
Software Development Senior Advisor | DELL INDIA PVT. LTD. | 12/2008 – 08/2011
Technical Associate | TECH MAHINDRA LTD | 06/2005 – 12/2008

EDUCATION
Masters Business Administration (M.B.A.) | INDIAN INSTITUTE OF MANAGEMENT (IIM)
International Immersion Module | UNIVERSITY OF PITTSBURGH
Bachelor of Science (B.S.), Technology | NATIONAL INSTITUTE OF TECHNOLOGY
`;

// ── Call Claude Haiku ──
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// ── Build final HTML by injecting tailored summary into completed template ──
function buildHtml(tailored) {
  let html = fs.readFileSync(templatePath, 'utf8');
  
  // Directly targets our completed template's placeholder summary macro
  html = html.replace('{{SUMMARY_TEXT}}', tailored.summary_text);
  return html;
}

// ── Generate resume for one job ──
async function generateResume(job) {
  console.log(`  Generating tailored profile summary for: ${job.title} @ ${job.company}`);

  const jd = job.description || '(no description available)';

  const prompt = `You are helping tailor a resume summary for a specific job application. Your job is to lightly adjust the executive summary section so it maps to the job description — while keeping everything sounding natural, written in first person, and authentic.

STRICT RULES:
- Do NOT invent new achievements, skills, or experiences not in the base resume.
- Keep ALL metrics exactly as-is (23%, 99%, 30%, 10%, 20%, 40k, 1M+).
- Tone must sound like a real person wrote it, not an AI.
- Shift emphasis toward aspects of my experience (such as platform architecture, pipelines, or orchestration) that are most relevant to this JD.
- The output text must read as my actual experience (Anoop's history).

BASE RESUME:
${BASE_RESUME}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION EXCERPT:
${jd}

Return ONLY valid JSON, no markdown formatting, no text before or after the JSON structure:
{
  "match_percentage": 90,
  "summary_text": "Your customized first-person summary paragraph here."
}`;

  try {
    const rawOutput = await callClaude(prompt);
    
    // Clean up possible markdown code block wrap tags if generated
    const cleanJsonString = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const tailored = JSON.parse(cleanJsonString);

    const finalHtml = buildHtml(tailored);
    const outputFilename = `resume_${job.id || Date.now()}.html`;
    const outputPath = path.join(resumesDir, outputFilename);
    
    fs.writeFileSync(outputPath, finalHtml);
    console.log(`  Success! Tailored output generated at: ${outputPath}`);
    
    // Log matching index criteria back to dashboard loop
    job.resume_generated = true;
    job.match_percentage = tailored.match_percentage;

  } catch (error) {
    console.error(`  Failed generation cycle for job ${job.id}:`, error.message);
  }
}

// ==========================================
// 4. BATCH EXECUTION RUNTIME PIPELINE
// ==========================================
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage instructions: node generate-resume.js --auto OR node generate-resume.js <job_id>");
    process.exit(0);
  }

  if (!fs.existsSync(jobsPath)) {
    console.error(`ERROR: database index not found at ${jobsPath}. Run fetch-jobs.js first.`);
    process.exit(1);
  }

  // WITH THIS:
const rawData = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
const jobs = Array.isArray(rawData) ? rawData : (rawData.jobs || rawData.data || []);

if (!Array.isArray(jobs)) {
  console.error('ERROR: Could not find a valid job array within jobs.json.');
  process.exit(1);
}


  if (args[0] === '--auto') {
    console.log("Running automation sequence: Scanning for local jobs with match score >= 70...");
    // Auto-generates layouts for high-intent Seattle matches
    const highMatchJobs = jobs.filter(j => j.score >= 70);
    
    for (const job of highMatchJobs) {
      await generateResume(job);
    }
    // Sync indices back to schema storage file
    fs.writeFileSync(jobsPath, JSON.stringify(jobs, null, 2));
  } else {
    const targetId = args[0];
    const targetJob = jobs.find(j => j.id === targetId);
    if (!targetJob) {
      console.error(`ERROR: Job reference ID "${targetId}" not found in current data index entries.`);
      process.exit(1);
    }
    await generateResume(targetJob);
  }
}

main();
