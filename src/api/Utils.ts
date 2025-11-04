
import request from '../utils/request';
type getDictParamss = Array<string> | null

type getDicts = {
    // dictType: string | null,
    // dictDataList?: Array<DictData> | null,
    [key: string]: DictData[]
}



type DictData = {
    dictLabel: string | null,
    dictValue: string | null,
    isDefault: string | null,
    status: number | null,
}

function getDict(dataList:getDictParamss) {
    return request({
        url: 'dict/data',
        data: dataList,
        method: 'post'
    });
}


export {
    getDict
}