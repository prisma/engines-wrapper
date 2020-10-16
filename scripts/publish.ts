import chalk from 'chalk'

console.log(chalk.bold.greenBright('Github Event:'))
console.log(JSON.parse(process.env.GITHUB_EVENT))
