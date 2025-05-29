# Atari-like Game Factory

A minimal autonomous pipeline to generate and play simple Atari-style games using Node.js, Express, and Phaser 3.

## Setup Instructions

1. **Clone the Phaser 3 repository to get the latest documentation:**

```sh
git clone https://github.com/photonstorm/phaser.git
```

2. **Copy or symlink the `phaser/docs` folder into your project as `phaser_docs/`:**

```sh
cp -r phaser/docs ./phaser_docs
# or, to keep it up to date automatically:
ln -s ../phaser/docs ./phaser_docs
```

3. **Install dependencies:**

```sh
npm install
```

4. **(Optional) Run the retriever script to test doc search:**

```sh
node phaser_retriever.js
```

---

- Generated games are saved in the `/games/` directory.
- No secrets or API keys are tracked in this repo. 