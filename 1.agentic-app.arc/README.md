# ARC Agent — Autonomous Affinity Diagram Generator

ARC Agent is an end-to-end **agentic automation system** that generates fully structured Activity Relationship Charts (ARC/ARD/SRD) directly from **natural-language descriptions**. 

It leverages **OpenAI tool-calling**, a **Node/TS agent loop**, and a **Paper.js rendering server** to produce clean SVG/PNG diagrams without any human involvement.

<img src="../0.assets/1.agentic-app.arc/arc-complete.png" height="500" style="background:white; padding:10px;">

---

## What the Agent Can Do

- Convert natural-language lists → complete ARC diagram  
- Automatically add items and normalize labels  
- Generate structured reason tables (1, 2, 3, …)  
- Assign A–O–U–E–I relationship scores  
- Auto-complete the entire pairwise relationship matrix  
- Detect and correct missing or asymmetric relations  
- Render diagrams via Paper.js → SVG/PNG output  
- Run fully autonomously using OpenAI’s Responses API  

---

# Current System Architecture

> Designed as a backend-only service, integrated into the **Takambang.com** infrastructure.

### 🔧 Technologies Used
- **Node.js**, **TypeScript**, **Express**  
- **OpenAI Responses API** for multi-step agent reasoning  
- **Paper.js** for vector-based diagram rendering  
- **jsdom** for server-side DOM emulation  
- **zod** for schema validation  
- **Custom rendering pipeline** adapted from Takambang’s existing client renderer  

### 📐 Architecture Diagram
_TODO: architecture diagram_

---

# Development Journey

## **(1/4) Affinity Diagrams Are Easy… Until They Aren’t**

Affinity diagrams look simple at first: list items, assign relations, classify importance.  
But real industrial / facility-planning ARC diagrams involve:

- dozens of items  
- pairwise relations for every combination  
- reasoning tables  
- maintaining directional consistency  
- validating the A–O–U–E–I scoring rules  

The cognitive load grows near **quadratically** with item count.  
This project started from the idea:  
**“Why not let an AI agent build the entire thing?”**

_TODO: illustrate complexity growth_

---

## **(2/4) Adapting a Client-Only Renderer for Backend Use**

Takambang already had a beautiful **Paper.js-based renderer** — optimized for browsers.  
But the agent runs on the backend, meaning:

- no DOM  
- no canvas  
- no browser environment  

The challenge: **port a browser renderer to Node.js**.

Solution:
- Use **jsdom** to emulate DOM APIs  
- Bind Paper.js to a **Node Canvas backend**  
- Patch rendering calls  
- Export exact SVG/PNG output the same way the browser renderer did  

_TODO: code snippet highlighting the trick_

---

## **(3/4) Implementing a Stateless, Tool-Driven Agent**

Thanks to the OpenAI Responses API, the agent is fully **tool-call orchestrated**:

1. The model decides which tool to call  
2. Executes atomic actions (addItem, setRelationScore, finalizeMatrix…)  
3. Rebuilds state each step  
4. Self-corrects inconsistent relations  
5. Assembles everything before rendering  

This stateless pattern makes the system:

- reproducible  
- safe  
- maintainable  
- inspectable (tool logs show full reasoning)  

_TODO: Tool schema_

---

## **(4/4) Future Improvements: Search, Multi-Agent, & Human in The Loop Flows**

Industrial ARC diagrams often reference:

- specialized equipment  
- facility constraints  
- regulated processes  
- production lines with domain-specific terms  

### 🚀 Potential Enhancements
- **Search tools** to fetch definitions / constraints before scoring  
- **Validator agent** that checks consistency  
- **Creator agent** that builds the matrix  
- **Rationale splitter** separating relationship scores vs. textual reasoning  
- **Scaling mode**: parallel relation assignment  

This would transform ARC Agent from a diagram generator into a **full industrial-planning AI system**.

_TODO: Improved diagram_

---

# 📬 Contact

**Adi Wira Pratama**  
AI Systems Engineer — Indonesia  

- **GitHub:** https://github.com/wira-pratama  
- **LinkedIn:** https://linkedin.com/in/adi-wira-pratama  
- **Email:** adiwira85pratama@gmail.com  

Feel free to reach out for collaboration, research discussions, or applied AI engineering work.