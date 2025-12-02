/**
 * Single source of truth for all MCP prompt definitions
 * Prompts are user-controlled templates that appear as slash commands in MCP clients
 */

export interface PromptArgument {
   name: string;
   description: string;
   required?: boolean;
}

export interface PromptMessage {
   role: 'user' | 'assistant';
   content: {
      type: 'text';
      text: string;
   };
}

export interface PromptDefinition {
   name: string;
   description: string;
   arguments?: PromptArgument[];
   handler: (args: Record<string, string>) => PromptMessage[];
}

const FIX_WEBVIEW_ERRORS_PROMPT = `I need help finding and fixing JavaScript errors in my Tauri app's webview.

Please follow these steps:

1. **Start a session** - Use \`tauri_driver_session\` with action "start" to connect to the running Tauri app

2. **Get console logs** - Use \`tauri_read_logs\` with source "console" to retrieve JavaScript errors or warnings

3. **Analyze the errors** - Look at the error messages, stack traces, and identify:
   - What type of error it is (TypeError, ReferenceError, SyntaxError, etc.)
   - Which file and line number the error originates from
   - What the root cause might be

4. **Find the source code** - Use code search or file reading tools to locate the problematic code in my project

5. **Propose a fix** - Explain what's wrong and suggest a concrete fix for each error found

6. **Stop the session** - Use \`tauri_driver_session\` with action "stop" to clean up

If no errors are found, let me know the app is running cleanly.

If the session fails to start, help me troubleshoot the connection (is the app running? is the MCP bridge plugin installed?).`;

const SETUP_PROMPT = `Help me set up the MCP Bridge plugin in my Tauri project so I can use these AI development tools.

## Prerequisites

- This is a **Tauri v2** project (check for \`src-tauri/\` directory and \`tauri.conf.json\`)
- If this is NOT a Tauri project, stop and let the user know this setup only applies to Tauri apps

## Setup Steps

### Step 1: Add the Rust Plugin

Add the plugin to \`src-tauri/Cargo.toml\` dependencies:

\`\`\`toml
[dependencies]
tauri-plugin-mcp-bridge = "0.2"
\`\`\`

Or run from the \`src-tauri\` directory:
\`\`\`bash
cargo add tauri-plugin-mcp-bridge
\`\`\`

### Step 2: Register the Plugin

In the Tauri app's entry point (usually \`src-tauri/src/lib.rs\` or \`src-tauri/src/main.rs\`), register the plugin.

Find the \`tauri::Builder\` and add the plugin (only in debug builds):

\`\`\`rust
let mut builder = tauri::Builder::default();
// ... existing plugins ...

#[cfg(debug_assertions)]
{
    builder = builder.plugin(tauri_plugin_mcp_bridge::init());
}

builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
\`\`\`

### Step 3: Enable Global Tauri (REQUIRED)

In \`src-tauri/tauri.conf.json\`, ensure \`withGlobalTauri\` is enabled:

\`\`\`json
{
  "app": {
    "withGlobalTauri": true
  }
}
\`\`\`

**This is required** - without it, the MCP bridge cannot communicate with the webview.

### Step 4: Add Plugin Permissions

Add the plugin permission to \`src-tauri/capabilities/default.json\` (create the file if it doesn't exist):

\`\`\`json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "mcp-bridge:default"
  ]
}
\`\`\`

If the file already exists, just add \`"mcp-bridge:default"\` to the existing permissions array.

## Verification

After setup:
1. Run the Tauri app in development mode (\`cargo tauri dev\` or \`npm run tauri dev\`)
2. The MCP bridge will start a WebSocket server on port 9223
3. Use \`tauri_driver_session\` with action "start" to connect
4. Use \`tauri_driver_session\` with action "status" to verify the connection

## Notes

- The plugin only runs in debug builds (\`#[cfg(debug_assertions)]\`) so it won't affect production
- The WebSocket server binds to \`0.0.0.0\` by default to support mobile device testing
- For localhost-only access, use \`Builder::new().bind_address("127.0.0.1").build()\` instead of \`init()\`

Please examine the project structure and make the necessary changes to set up the MCP bridge plugin.`;

/**
 * Complete registry of all available prompts
 */
export const PROMPTS: PromptDefinition[] = [
   {
      name: 'fix-webview-errors',
      description:
         '[Tauri Apps Only] Find and fix JavaScript errors in a running Tauri app. ' +
         'Use ONLY for Tauri projects (with src-tauri/ and tauri.conf.json). ' +
         'For browser debugging, use Chrome DevTools MCP instead. ' +
         'For Electron apps, this prompt will NOT work.',
      arguments: [],
      handler: () => {
         return [
            {
               role: 'user',
               content: {
                  type: 'text',
                  text: FIX_WEBVIEW_ERRORS_PROMPT,
               },
            },
         ];
      },
   },

   {
      name: 'setup',
      description:
         'Set up the MCP Bridge plugin in a Tauri project. ' +
         'Guides through adding the Rust crate, registering the plugin, enabling withGlobalTauri, ' +
         'and adding permissions. Use this when starting with a new Tauri project.',
      arguments: [],
      handler: () => {
         return [
            {
               role: 'user',
               content: {
                  type: 'text',
                  text: SETUP_PROMPT,
               },
            },
         ];
      },
   },
];

/**
 * Create a Map for fast prompt lookup by name
 */
export const PROMPT_MAP = new Map(PROMPTS.map((prompt) => { return [ prompt.name, prompt ]; }));
