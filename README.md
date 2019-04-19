# dochammer

Code documentation made easy and fun.


## Motivation

Most of the projects uses the documentation in a different place (wiki, a readme, etc) and all the docs are centralized there.

The problem with this approach is because some times the members could forgot to update the doc because it's not directly visible.

The `dochammer` was created to have the `markdown` documentation side-by-side with your code **without** changing your code file (like jsdocs, etc).

With `dochammer` you can create your code doc as:

```
+ services/
  + user-service/
    - user-service.js
    - user-service.doc.md
```

And then you can generate the final documentation using a simple command line.


## Setup

Install dochammer:

```
npm install -g dochammer
```

In your project, create a `dochammer.config.js` on the root (same level as `node_modules`).

```js
module.exports = {
  outputDir: './docs',
  inputDir: './my-app-src',
  inputFileExt: '.doc.md'
}
```

| config | type | required | description |
| ------ | ---- | -------- | ----------- |
| outputDir | string | yes | Where the generated documentation should be stored |
| inputDir | string | yes | Where `dochammer` should look for documentation files |
| inputFileExt | string | yes | The extensions of the documentation file. The `dochammer` will use it to find the docs. In the sample, `dochammer` will considere all the files ending with `.doc.md` as documentation file. |


## Usage

The `dochammer` has 2 types of documents you can create: `page` and `component`.

### Page
A `page` is a document that will be generated. To explain better, let's use this sample:

You have a service in your application that returns a user by it's id:

```
+ services/
  + user/
    - get-user.service.js
```
```js
module.exports = async id => {
  // ...
  return {
    // user data
  }
}
```

You can create a doc file for the service:
```
+ services/
  + user/
    - get-user.service.js
    - get-user.service.doc.md
```

```md
---
type: page
filename: services
---

## Get User Service

This service returns a user by it's id.

### Usage:

const service = require('./get-user.service')
const user = await service('user-id-1')
```

Where:

| header | description |
| ------ | ----------- |
| type | the type of the doc, in this case: `page` |
| filename | all the pages will be generated in a file. The `filename` header indicate the name of the file. If more than one doc uses the same filename, it will be concatenated in the same file |

Ok, we are done with our page.

Now, in the terminal in the root of your project, just run:

```bash
dochammer
```

It will generate a folder named `docs` (that we configured  in the `dochammer.config.js` as `outputFolder`) with a file `services.md` (that was the `filename` in the doc header)

```
+ docs/
  - services.md
```



### Component

Components are the best way to **reuse** documentation inside other documents.

To create a component, you just need to create a doc with:

```md
---
type: component
id: my-component
---

## My component

bla bla bla
```

You can use it in your pages using:

```md
---
type: page
filename: services
---

## My service

%{component:my-component}
```

Where `my-component` is the `id` of your component.

Now, if you run `dochammer` to generate the docs, the `%{component:my-component}` will be replaced with the content of the component doc.


**component**
```md
---
type: component
id: my-component
---

## My component

bla bla bla
```

**page**
```md
---
type: page
filename: services
---

## My service

%{component:my-component}
```

**result**
```md
---
type: page
filename: services
---

## My service

## My component

bla bla bla
```

## Using variables

You can use pre-configured variables in your template rendering.

To use it, you need to:

### Add the variables to dochammer.config.js

```js
module.exports = {
  variables: {
    api_url: 'http://api.com'
  },
  //...
}
```

### Use the variable inside your doc

```md
---
type: component
id: my-component
---

Hey this is a component

%{variable:api_url}
```