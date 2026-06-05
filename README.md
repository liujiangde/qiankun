# React/Vue Qiankun Micro Frontend

This project is a minimal React + Vue + qiankun micro-frontend workspace.

## Structure

```text
apps/
  main/              # qiankun host app, runs on port 7100
  react-dashboard/   # React micro app, runs on port 7101
  vue3-app/          # Vue 3 micro app, runs on port 7102
```

## Commands

Install dependencies:

```bash
pnpm install
```

Run all apps:

```bash
pnpm dev
```

Open the host app:

```text
http://localhost:7100
```

The micro apps are mounted by the host at:

```text
http://localhost:7100/react-dashboard
http://localhost:7100/vue3-app
```

Run apps separately:

```bash
pnpm dev:main
pnpm dev:react-dashboard
pnpm dev:vue3-app
```

Build all workspaces:

```bash
pnpm build
```
