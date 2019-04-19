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
  config = require(
    path.resolve(
      process.cwd(),
      'dochammer.config.js'
    )
  )
}

function clean() {
  fse.removeSync(config.outputDir)
  fse.ensureDirSync(config.outputDir)
}

function readFiles() {
  const fileSearchPattern = `${config.inputDir}/**/*${config.inputFileExt}`

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

  if (file.header.type === 'page' && !file.header.filename) {
    showError(`The file ${file.path} is a page and should have a "filename".`)
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

  let pageFiles = {}

  for (let page of pages) {
    injectComponents(page)
    injectVariables(page)

    const filename = page.header.filename

    if (!pageFiles[filename]) {
      pageFiles[filename] = []
    }

    pageFiles[page.header.filename].push(page)
  }

  const filenameKeys = Object.keys(pageFiles)

  for (let secKey of filenameKeys) {
    const fileFullPath = path.resolve(
      config.outputDir,
      `${secKey}.md`
    )

    const pages = pageFiles[secKey]

    const fileContent = pages.map(p => p.content).join('\n\n\n')

    fse.ensureFileSync(fileFullPath)
    fs.writeFileSync(fileFullPath, fileContent)
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