export function tansParams(params:any) {
    let result = ""
    for (const propName of Object.keys(params)) {
        const value = params[propName]
        let part = propName + "="
        if (value !== null && value !== "" && typeof (value) !== 'undefined') {
            if (typeof value === 'object') {
                for (const key of Object.keys(value)) {
                    if (value !== null && value !== "" && typeof (value[key]) !== 'undefined') {
                        let params = propName + "[" + key + "]="
                        result += params + value[key] + "&"
                    }
                }
            }else{
                result += part + value + "&"
            }
        }
    }

    return result
}
