<div align='center'>

<h1>TypeMap</h1>

<p>Syntax Compiler and Translation System for Runtime Types</p>

<br />
<br />

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## About This Fork

This is the **@alkdev/typemap** fork — a community-maintained continuation of TypeMap 0.x. The original TypeMap project has been archived after a complete rewrite; this fork continues the 0.x API with the `@alkdev/typebox` backend.

- **Supply chain security**: Published from our own infrastructure; no dependency on upstream publish access.
- **Stability**: No breaking rewrites planned. Bug fixes and compatibility patches only.
- **Drop-in replacement**: `@alkdev/typemap` is API-compatible with `@sinclair/typemap` 0.x, using `@alkdev/typebox` in place of `@sinclair/typebox`.

## Install

```bash
$ npm install @alkdev/typemap --save
```

## Usage

Parse and Compile Types from TypeScript Syntax

```typescript
import { Compile } from "@alkdev/typemap";

const validator = Compile(`{ a: string, b: string }`);

const result = validator["~standard"].validate({
  a: "hello",
  b: "world",
});
```

## Overview

TypeMap is a syntax frontend and compiler backend for the [TypeBox](https://git.alk.dev/alkdev/typebox), [Valibot](https://github.com/fabian-hiller/valibot) and [Zod](https://github.com/colinhacks/zod) runtime type libraries. It offers a common TypeScript syntax for type construction, a runtime compiler for high-performance validation and type translation from one library to another.

## Example

Use TypeScript syntax to create types for TypeBox, Valibot and Zod

```typescript
import { TypeBox, Valibot, Zod } from "@alkdev/typemap";

const S = `{
  x: number,
  y: number,
  z: number
}`;

const T = TypeBox(S);
const V = Valibot(S);
const Z = Zod(S);
```

Translate TypeBox, Valibot and Zod types

```typescript
import { TypeBox, Valibot, Zod } from "@alkdev/typemap";

const T = TypeBox(
  Valibot(
    Zod(`{
  x: number,
  y: number,
  z: number
}`),
  ),
);
```

## Mapping

TypeMap is designed for runtime type translation. It provides one mapping function per library which can be used to translate remote types into types specific to that library.

### Syntax

```typescript
import { Syntax } from "@alkdev/typemap";

const S = Syntax("string[]");
const T = Syntax(t.Number());
const V = Syntax(v.string());
const Z = Syntax(z.boolean());
```

### TypeBox

```typescript
import { TypeBox } from "@alkdev/typemap";

const S = TypeBox("string[]");
const T = TypeBox(t.Number());
const V = TypeBox(v.string());
const Z = TypeBox(z.boolean());
```

### Valibot

```typescript
import { Valibot } from "@alkdev/typemap";

const S = Valibot("string[]");
const T = Valibot(t.Number());
const V = Valibot(v.string());
const Z = Valibot(z.boolean());
```

### Zod

```typescript
import { Zod } from "@alkdev/typemap";

const S = Zod("string[]");
const T = Zod(t.Number());
const V = Zod(v.string());
const Z = Zod(z.boolean());
```

## Syntax

TypeMap provides an optional TypeScript syntax parser that can be used to construct library types. Syntax parsing is implemented at runtime as well as in the type system.

### Types

```typescript
import { TypeBox } from "@alkdev/typemap";

const T = TypeBox("{ x: 1, y: 2 }");

const S = TypeBox("!!!");
```

### Options

```typescript
import { TypeBox, Zod } from "@alkdev/typemap";

const T = TypeBox("string", {
  format: "email",
});

const S = Zod("{ x?: number }", {
  additionalProperties: false,
});
```

### Parameters

```typescript
import { Valibot, Zod } from "@alkdev/typemap";

const V = Valibot("number");

const Z = Zod({ V }, `{ values: V[] }`);
```

### Generics

```typescript
import { TypeBox, Valibot, Zod } from "@alkdev/typemap";

const Vector = <T extends object>(T: T) =>
  TypeBox(
    { T },
    `{ 
  x: T, 
  y: T, 
  z: T 
}`,
  );

const T = Vector(Valibot("number"));

const S = Vector(Zod("string"));
```

## Static

Use Static to infer for library and syntax types

```typescript
import { type Static } from "@alkdev/typemap";

const T = t.Number();
const V = v.string();
const Z = z.boolean();
const S = "string[]";

type S = Static<typeof S>;
type T = Static<typeof T>;
type V = Static<typeof V>;
type Z = Static<typeof Z>;
```

## Json Schema

Use `TypeBox` to transform remote library types into Json Schema

```typescript
import { TypeBox as JsonSchema } from "@alkdev/typemap";

const Z = z
  .object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })
  .strict();

const T = JsonSchema(Z);
```

## Tree Shake

TypeMap takes on TypeBox, Valibot and Zod as peer dependencies. If bundling, it is recommended that you import specific translation functions to enable unused libraries to be omitted from the bundle.

```typescript
import { TypeBoxFromZod } from "@alkdev/typemap";

import * as z from "zod";

const T = TypeBoxFromZod(
  z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
);
```

## Compile

Use the `Compile` function to compile TypeBox, Valibot and Zod on TypeBox infrastructure

```typescript
import { Compile, Zod } from "@alkdev/typemap";

const validator = Compile(
  Zod(`{
   x: number,
   y: number,
   z: number
}`),
);

const R1 = validator.Check({ x: 1, y: 2, z: 3 });

const R2 = validator["~standard"].validate({ x: 1, y: 2, z: 3 });
```

## Contribute

This project is open to community contributions. Please ensure you submit an open issue before creating a pull request.

License: MIT
