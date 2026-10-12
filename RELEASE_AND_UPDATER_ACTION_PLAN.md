# OrbitGravity — Release & Auto-Updater Action Plan 🪐🚀

> **Comprehensive Roadmap for Automated GitHub Releases & Seamless In-App Updates**  
> This action plan explicitly separates what **You (The Developer)** must do manually from what **Antigravity (The AI Assistant)** will automate for you.

---

## 📋 Table of Contents
1. [Overview & Target Workflow](#1-overview--target-workflow)
2. [Phase 1: Preparation & Cryptographic Keys](#phase-1-preparation--cryptographic-keys)
3. [Phase 2: Codebase Integration (AI Automated)](#phase-2-codebase-integration-ai-automated)
4. [Phase 3: GitHub CI/CD Pipeline Configuration](#phase-3-github-cicd-pipeline-configuration)
5. [Phase 4: Publishing a Release (Human Trigger)](#phase-4-publishing-a-release-human-trigger)
6. [Phase 5: End-to-End Verification Checklist](#phase-5-end-to-end-verification-checklist)

---

## 1. Overview & Target Workflow

Our goal is a zero-friction update pipeline:
1. You make improvements and push a git tag (e.g., `git tag v1.0.1 && git push origin v1.0.1`).
2. GitHub Actions automatically runs tests, compiles the Windows binary, digitally signs it, and publishes a GitHub Release with an auto-updater manifest (`latest.json`).
3. When users run OrbitGravity, the app checks GitHub in the background, silently downloads the new build, and presents a sleek **`[ 🚀 Update Ready • Restart App ]`** button in the top titlebar.
4. Clicking the button restarts the application in ~2 seconds with **zero data loss** (all accounts, profiles, conversations, and Star Brains stay untouched).

---

## 2. Phase 1: Preparation & Cryptographic Keys

Because cryptographic signing protects your users against malicious tampering, some steps require manual human control.

### 🧑 Human Phase (What You Must Do Manually)

#### Step 1.1: Generate Your Tauri Signing Keypair
Open PowerShell in the project directory and run:
```powershell
npx tauri signer generate -w ~/.tauri/orbitgravity.key
```
You will be prompted:
1. **Password**: Enter a secure password (or press `Enter` for no password, though a password is recommended).
2. **Output**: Tauri will generate two keys:
   - **Public Key**: Displayed directly in the terminal (starts with `dW50cnVzdGVkIGNvbW1lbnQ6...`).
   - **Private Key**: Saved to `~/.tauri/orbitgravity.key` (or `%USERPROFILE%\.tauri\orbitgravity.key`).

> [!IMPORTANT]
> **Keep Your Private Key Secret!**  
> Never commit `orbitgravity.key` to Git or share it publicly. You will paste this private key into GitHub Secrets in Step 1.3.

---

#### Step 1.2: Create or Verify Your GitHub Repository
1. Ensure your project is pushed to a GitHub repository (e.g., `https://github.com/<your-username>/orbitgravity` or `bettermultigravity`).
2. Note your GitHub **Username** (or Organization) and **Repository Name**.

---

#### Step 1.3: Add GitHub Repository Secrets
1. Navigate to your repository on GitHub in your browser.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Click **"New repository secret"** and add the following two secrets:

| Secret Name | Value to Paste | Description |
| :--- | :--- | :--- |
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/orbitgravity.key` | The private key string generated in Step 1.1. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you entered (if any) | The passphrase used to protect the key (leave empty if none). |

> [!NOTE]
> GitHub provides a default `GITHUB_TOKEN` automatically in workflows, so you do not need to create a personal access token for basic releases.

---

### 🤖 AI Phase (What I Will Do for Phase 1)
- Once you provide the **Public Key** string from Step 1.1 and your **GitHub repository URL**, I will embed the public key directly into [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) and set the update endpoints.

---

## 3. Phase 2: Codebase Integration (AI Automated)

### 🤖 AI Phase (100% Automated by Assistant)
You will not need to write any Rust or React code for this phase. I will handle:

1. **Install Tauri Plugin Dependencies**:
   - Add `tauri-plugin-updater = "2"` to [`src-tauri/Cargo.toml`](./src-tauri/Cargo.toml).
   - Install `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` in `package.json`.
2. **Register Plugin in Rust Backend**:
   - Update [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs) to initialize the updater plugin:
     ```rust
     .plugin(tauri_plugin_updater::Builder::new().build())
     ```
3. **Configure `tauri.conf.json`**:
   - Add the `"plugins"` configuration block pointing to GitHub Releases:
     ```json
     "plugins": {
       "updater": {
         "pubkey": "<YOUR_PUBLIC_KEY>",
         "endpoints": [
           "https://github.com/<your-username>/<repo>/releases/latest/download/latest.json"
         ]
       }
     }
     ```
4. **Implement UI Update Hook & Titlebar Button**:
   - Build a lightweight `useAppUpdater` React hook in `src/hooks/useAppUpdater.ts`.
   - Add the glowing **`[ 🚀 Update Ready • Restart App ]`** button to the top navigation bar in [`src/App.tsx`](./src/App.tsx).
   - Ensure the button *only* appears when an update has been silently downloaded and verified.
5. **Verify Compilation**:
   - Run `npm run build` and `cargo check` to ensure zero compilation or type errors.

---

## 4. Phase 3: GitHub CI/CD Pipeline Configuration

### 🤖 AI Phase (Automated by Assistant)
I will write the complete GitHub Actions workflow file: [`.github/workflows/release.yml`](./.github/workflows/release.yml).

The workflow will automate:
1. Running on any pushed version tag (`v*`).
2. Running tests on Windows (`cargo test` ensuring 31/31 tests pass).
3. Compiling the frontend (`npm run build`).
4. Invoking `tauri-apps/tauri-action`:
   - Builds the NSIS setup installer (`OrbitGravity_x.x.x_x64-setup.exe`).
   - Builds the update payload archive (`.zip`).
   - Signs both assets using your `TAURI_SIGNING_PRIVATE_KEY`.
   - Generates the `latest.json` manifest.
   - Publishes a formal GitHub Release draft with all artifacts attached.

---

## 5. Phase 4: Publishing a Release (Human Trigger)

Once the codebase and GitHub Secrets are configured, publishing a release requires only two terminal commands from you.

### 🧑 Human Phase (What You Must Do Manually)

#### Step 4.1: Bump Version Numbers
When you are ready to release a new version (e.g., `1.0.1`):
1. In `package.json`: change `"version": "1.0.0"` to `"1.0.1"`.
2. In `src-tauri/tauri.conf.json`: change `"version": "1.0.0"` to `"1.0.1"`.
3. In `src-tauri/Cargo.toml`: change `version = "0.1.0"` to `"1.0.1"`.
*(Or ask me to bump all version numbers for you!)*

---

#### Step 4.2: Commit & Push the Tag
Run the following in PowerShell:
```powershell
# 1. Commit any changes
git add .
git commit -m "chore: release v1.0.1"

# 2. Create the git tag
git tag v1.0.1

# 3. Push to GitHub
git push origin master
git push origin v1.0.1
```

---

#### Step 4.3: Watch the Build & Publish
1. Go to your repository on GitHub and click the **Actions** tab.
2. Watch the **Release OrbitGravity** workflow execute (~5–8 minutes).
3. Once completed, navigate to **Releases**.
4. You will see a draft release containing:
   - `OrbitGravity_1.0.1_x64-setup.exe` (Installer for new users)
   - `OrbitGravity_1.0.1_x64.nsis.zip` (Delta update for existing users)
   - `latest.json` (Auto-updater manifest)
5. Review the release notes and click **Publish Release** (or configure the workflow to publish automatically).

---

## 6. Phase 5: End-to-End Verification Checklist

| Step | Action | Expected Result | Responsible |
| :---: | :--- | :--- | :---: |
| 1 | Run `npx tauri signer generate` | Keypair generated; private key saved to disk | 🧑 **Human** |
| 2 | Add GitHub Secrets | `TAURI_SIGNING_PRIVATE_KEY` stored in repo | 🧑 **Human** |
| 3 | Install dependencies & configure updater | `tauri-plugin-updater` configured in Cargo & React | 🤖 **AI** |
| 4 | Add `.github/workflows/release.yml` | CI/CD workflow created | 🤖 **AI** |
| 5 | Push tag `v1.0.0` | GitHub Action produces initial release with `latest.json` | 🧑 **Human** |
| 6 | Install v1.0.0 on test machine | OrbitGravity runs and creates instance profiles | 🧑 **Human** |
| 7 | Push tag `v1.0.1` with a minor change | GitHub Action produces v1.0.1 release | 🧑 **Human** |
| 8 | Open v1.0.0 app | **`[ 🚀 Update Ready • Restart App ]`** appears in titlebar | 🤖 **Auto** |
| 9 | Click Restart button | App relaunches in v1.0.1; all profiles and data intact | 🧑 **Human** |

---

## Summary of Responsibilities

```
                                      ACTION PLAN SPLIT
    
    🧑 YOU (HUMAN)                                      🤖 ME (AI ASSISTANT)
    ---------------------------------------------       ---------------------------------------------
    1. Run keygen command & save private key            1. Install updater crates & npm packages
    2. Paste private key into GitHub Repo Secrets       2. Embed public key into tauri.conf.json
    3. Provide your GitHub username & repo name         3. Implement React updater hook & titlebar UI
    4. Push git tags (git push origin v1.0.1)           4. Write .github/workflows/release.yml
    5. Test & enjoy seamless auto-updates               5. Validate builds (cargo test & npm run build)
```
