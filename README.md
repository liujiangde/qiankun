# React Qiankun Micro Frontend

This project is a minimal React + qiankun micro-frontend workspace.

## Structure

```text
apps/
  main/              # qiankun host app, runs on port 7100
  react-dashboard/   # React micro app, runs on port 7101
```

## Commands

Install dependencies:

```bash
pnpm install
```

Run both apps:

```bash
pnpm dev
```

Open the host app:

```text
http://localhost:7100
```

The micro app is mounted by the host at:

```text
http://localhost:7100/react-dashboard
```

Run apps separately:

```bash
pnpm dev:main
pnpm dev:react-dashboard
```

Build all workspaces:

```bash
pnpm build
```
