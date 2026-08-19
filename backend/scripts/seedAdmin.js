#!/usr/bin/env node
/**
 * Creates or updates the Super Admin user.
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from environment (.env),
 * falling back to interactive prompts if any are missing.
 *
 * Usage:
 *   npm run seed:admin
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=Secret123! node scripts/seedAdmin.js
 */
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcrypt');
const { pool } = require('../src/db/pool');
const userModel = require('../src/models/userModel');

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }
    // Basic hidden input for password prompts
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.resume();
    stdin.setRawMode && stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '') {
        stdin.removeListener('data', onData);
        stdin.setRawMode && stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write('\n');
        rl.close();
        resolve(value.trim());
      } else if (char === '') {
        process.exit(1);
      } else if (char === '') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  if (!email || !isValidEmail(email)) {
    email = await prompt('Admin email: ');
  }
  if (!name) {
    name = (await prompt('Admin name [Super Admin]: ')) || 'Super Admin';
  }
  if (!password || password.length < 8) {
    password = await prompt('Admin password (min 8 chars): ', true);
  }

  if (!isValidEmail(email)) {
    console.error('A valid email is required.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = await userModel.upsertAdmin({ name, email, passwordHash });

  console.log(`Super Admin ready. id=${id} email=${email}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
