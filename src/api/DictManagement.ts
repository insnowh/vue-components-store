import request from '../utils/request';

type searchFormData = {
        dictName: string | null,
        dictType: string | null,
        status: number | null,
        createBy: string | null,
        createStartTime: string | null,
        createEndTime: string | null,
        updateBy: string | null,
        updateStartTime: string | null,
        updateEndTime: string | null,
        pageSize: number | null,
        pageNum: number | null,
}

type DictData = {
        dictDataId: number | null,
        dictDataSort: number | null,
        dictDataLabel: string | null,
        dictDataValue: string | null,
        isDefault: string | null,
        dictDataStatus: number | null,
        dictDataCreateBy: string | null,
        dictDataCreateById: number | null,
        dictDataCreateTime: string | null,
        dictDataUpdateBy: string | null,
        dictDataUpdateById: number | null,
        dictDataUpdateTime: string | null,
        dictDataRemark: string | null,
}

type editFormData = {
        id: number | null,
        dictName: string | null,
        dictType: string | null,
        status: number | null,
        createBy: string | null,
        createById: number | null,
        createTime: string | null,
        updateBy: string | null,
        updateById: number | null,
        updateTime: string | null,
        remark: string | null,
        dictDataList?: Array<DictData> | null
}

function getDict(searchFormData:searchFormData) {
    return request({
        url: 'dict/getDictList',
        params: searchFormData,
        method: 'get'
    });
}

function addDict(editFormData:editFormData) {
    return request({
        url: 'dict/addDict',
        data: editFormData,
        method: 'post'
    });
}

function updateDict(editFormData:editFormData) {
    return request({
        url: 'dict/updateDict',
        data: editFormData,
        method: 'put'
    });
}

function selectDictById(id:number) {
    return request({
        url: `dict/getDict/${id}`,
        method: 'get'
    });
}

function deleteDictById(id:number) {
    return request({
        url: `dict/deleteDict/${id}`,
        method: 'delete'
    });
}

function deleteDictByIds(id:number) {
    return request({
        url: `dict/deleteDictByIds`,
        method: 'delete'
    });
}


export { getDict, addDict, updateDict, selectDictById, deleteDictById, deleteDictByIds };