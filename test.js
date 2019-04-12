var content = `
---
type: component
id: my-component
---

Hey this is a component

%{variable:api_url}

%{component:nested-component}
%{component:nested-component-2}
`
var rx = /%{component:(.*)}/gm;
var arr = rx.exec(content);

console.log(arr)
  