#!/usr/bin/env node

const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const glob = require('glob')

let config = null
let files = []

loadConfig()
clean()
readFiles()
generatePages()

function loadConfig() {
  config = JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        'dochammer.config.json'
      )
    ).toString()
  )
}

function clean() {
  fse.removeSync(config.output_dir)
  fse.ensureDirSync(config.output_dir)
}

function readFiles() {
  const fileSearchPattern = `${config.input_dir}/**/*.${config.file_ext}`

  const filesFound = glob.sync(fileSearchPattern)

  files = []

  for (let filePath of filesFound) {
    const file = parseFile(filePath)

    files.push(file)
  }
}

function parseFile(filePath) {
  const fileContent = fs.readFileSync(filePath).toString()

  const header = extractHeader(fileContent)
  const contentWithoutHeader = removeHeader(fileContent)

  const file = {
    header,
    content: contentWithoutHeader,
    path: filePath
  }

  validateFile(file)

  return file
}

function showError(error) {
  console.error(error)
  process.exit(1)
}

function validateFile(file) {
  if (!file.header.type) {
    showError(`The file ${file.path} must have a "type" in the header.`)
  }

  const validHeaders = ['page', 'component', 'main']
  if (validHeaders.indexOf(file.header.type) < 0) {
    showError(`The file ${file.path} have a invalid header "type". The available types are: ${validHeaders.join(' | ')}.`)
  }

  if (file.header.type === 'component' && !file.header.id) {
    showError(`The file ${file.path} is a component and should have an "id".`)
  }

  if (file.header.type === 'page' && !file.header.title) {
    showError(`The file ${file.path} is a page and should have a "title".`)
  }

  if (file.header.type === 'page' && !file.header.section) {
    showError(`The file ${file.path} is a page and should have a "section".`)
  }
}

function removeHeader(fileContent) {
  const delimiter = '\n---'
  return fileContent.substring(
    fileContent.indexOf(delimiter) + delimiter.length + '\n'.length,
    fileContent.length
  )
}

function extractHeader(fileContent) {
  const lines = fileContent.split('\n')

  let headerLines = []

  for(let i = 1; i < lines.length; i++) {
    const line = lines[i]

    if (line === '---') {
      break
    }

    headerLines.push(line)
  }

  let header = {}

  for (let head of headerLines) {
    const [key, value] = head.split(':').map(h => h.trim())
    header[key] = value
  }

  return header
}

function generatePages() {
  const pages = files.filter(f => f.header.type === 'page')

  let pageSections = {}

  for (let page of pages) {
    injectComponents(page)
    injectVariables(page)

    const section = page.header.section

    if (!pageSections[section]) {
      pageSections[section] = []
    }

    pageSections[page.header.section].push(page)
  }

  const sectionKeys = Object.keys(pageSections)

  for (let secKey of sectionKeys) {
    const fileName = path.resolve(
      config.output_dir,
      `${secKey}.md`
    )

    const pages = pageSections[secKey]

    const sectionContent = pages.map(p => p.content).join('\n\n\n')

    fs.writeFileSync(fileName, sectionContent)
  }
}

function injectComponents(file) {
  const fileContent = file.content
  const componentSearchPattern = '%{component:'
  const rxComponent = /%{component:(.*)}/gm;

  let parsed = fileContent

  const components = files.filter(f => f.header.type === 'component')

  function hasComponents() {
    return parsed.indexOf(componentSearchPattern) >= 0
  }

  while (hasComponents()) {
    const rxResult = rxComponent.exec(parsed)

    if (rxResult[1]) {
      const compText = rxResult[0]
      const compId = rxResult[1]

      const component = components.find(c => c.header.id === compId)

      if (!component) {
        showError(
          `The component "${compId}" does not exist.`
        )
      }

      parsed = parsed.replace(new RegExp(`${compText}`, 'g'), component.content)
    }
  }

  file.content = parsed
}

function injectVariables(file) {
  const fileContent = file.content

  const variableSearchPattern = '%{variable:'

  const hasVariables = fileContent.indexOf(variableSearchPattern)

  if (!hasVariables) {
    return
  }

  let parsed = fileContent

  const variableKeys = Object.keys(config.variables)

  for(let vk of variableKeys) {
    parsed = parsed.replace(new RegExp(`%{variable:${vk}}`, 'g'), config.variables[vk])
  }

  file.content = parsed
}