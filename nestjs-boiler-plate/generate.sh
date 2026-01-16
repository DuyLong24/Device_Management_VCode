#!/bin/bash

# Script để generate NestJS module với cú pháp đơn giản
# Sử dụng: ./generate.sh <module-name> <field1>:<type> <field2>:<type> ...

if [ $# -lt 2 ]; then
    echo "Usage: ./generate.sh <module-name> <field1>:<type> <field2>:<type> ..."
    echo "Example: ./generate.sh product name:string price:number description:string category:string inStock:boolean"
    echo ""
    echo "Supported types: string, number, boolean, date, email"
    exit 1
fi

# Chạy generator
node generate.js "$@"

echo ""
echo "🎉 Done! Your module is ready to use."
echo ""
echo "Next steps:"
echo "1. Add the module to your app.module.ts:"
echo "   import { $(echo $1 | sed 's/.*/\u&/')Module } from './src/${1}s/${1}s.module';"
echo ""
echo "2. Add to imports array in app.module.ts:"
echo "   imports: [$(echo $1 | sed 's/.*/\u&/')Module, ...]"
