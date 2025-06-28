# Blend MCP

**Blend MCP** is the universal AI gateway for the Blend Protocol on Stellar. It exposes all Blend DeFi actions—lending, borrowing, pool creation, risk analysis, and more—as simple, composable tools accessible by any AI assistant, bot, or app.

---

## 🚀 Features

- **Natural Language DeFi:** Lend, borrow, repay, withdraw, and more—by command.
- **Pool Management:** Create new pools, add reserves, and manage Blend pools programmatically.
- **Risk Analysis:** Fetch and analyze pool/user data for safety and investment decisions.
- **Composable Workflows:** Chain actions together (e.g., "analyze pool, then lend if safe").
- **AI Assistant Integration:** Works with ChatGPT, Claude, or your own custom AI/bot.
- **Extensible:** Add new tools for NFTs, bridges, or any Soroban contract.
- **Open Source & Hackathon Ready:** Built for rapid prototyping and experimentation.
- **More features coming soon!**

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User(("User / AI Assistant"))
    MCPServer(["Blend MCP Server"])
    BlendSDK(["Blend Protocol SDK"])
    Stellar(["Stellar Network"])
    NFT(["NFT Contract / dApps"])

    User-->|"Natural Language Command"|MCPServer
    MCPServer-->|"Tool Call (lend, borrow, risk, etc.)"|BlendSDK
    BlendSDK-->|"Soroban Transaction"|Stellar
    MCPServer-->|"Composable Actions"|NFT
    NFT-->|"On-chain Action"|Stellar
    BlendSDK-->|"Data Fetch"|Stellar
    MCPServer-->|"Result (Analysis, Confirmation, etc.)"|User
```

---

## ⚡ Quick Start

1. **Clone the repo:**
   ```bash
   git clone [your-repo-url]
   cd BlendMcp
   yarn install # or npm install
   ```
2. **Set your environment variables:**
   - `AGENT_SECRET` (your Stellar secret key for signing transactions)
   - (Optional) `POOL_FACTORY_ID`, `BACKSTOP_ID`, etc. for advanced features
3. **Run the MCP server:**
   ```bash
   yarn start # or npm start
   ```
4. **Connect your AI assistant or app:**
   - Use the MCP protocol (stdio or HTTP) to send commands and receive results.
   - See `src/server.ts` for available tools and schemas.

---

## 🤖 How to Connect Your AI Assistant

- **ChatGPT, Claude, or Custom Bot:**
  - Point your assistant to the MCP server endpoint.
  - Provide your Stellar secret key (AGENT_SECRET) for transaction signing.
  - Issue natural language commands, e.g.:
    - "Lend 100 USDC to Pool X"
    - "Analyze Pool Y and tell me if it's safe to lend"
    - "If safe, lend 40% of my XLM to Pool Y"
    - "Buy this NFT and pay later using Blend"

---

## 🧠 Example Advanced Queries

- "Analyze Pool X for risk, and if it's safe, lend 40% of my XLM."
- "Create a new pool, add a reserve, and lend 100 USDC."
- "Borrow from Pool Y, buy an NFT, and set up a repayment plan."
- "Show me my current positions and risk exposure."

---

## 🛠️ Contributing

- PRs and issues welcome! This project is in active development for the Stellar Blend hackathon.
- Want to add a new tool or integration? Open an issue or PR.

---

## 📬 Contact

- [Your Name/Team]
- [Your preferred contact/email]
- [Repo URL]

---

## 📝 Notes

- **Blend MCP is under active development.** More features and integrations are coming soon!
- Built for the Stellar Blend hackathon, but designed for long-term extensibility and composability. 