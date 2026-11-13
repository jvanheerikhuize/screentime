# Contributing

Thanks for helping out! Bug reports, ideas and pull requests are all welcome.

## Getting set up

You need Node.js 22.18+ and ffmpeg (see the [README](README.md#requirements)).

```bash
npm install
npm run dev
```

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same checks on every pull request.

## Guidelines

- Keep pull requests small and focused on one change.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) style, e.g. `feat(live): add channel favourites` or `fix(player): resume after seeking`.
- Add or update tests in `tests/` for logic you change. UI changes are easier to review with a screenshot.
- Only free, openly available services are built in. Anything that needs a paid account belongs behind an optional setting.
- Please don't add indexers or sources whose main purpose is piracy.

## Reporting bugs

Open an issue with what you did, what you expected and what happened. Include your OS, Node.js version and browser. For security issues, see [SECURITY.md](SECURITY.md) instead.

By contributing you agree that your work is released under the [MIT License](LICENSE).
