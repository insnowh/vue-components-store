import request from '../utils/request';

type searchFormData = {}

type editFormData = {}

function getDictList(searchFormData:searchFormData) {
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

export { getDictList, addDict, updateDict, selectDictById, deleteDictById, deleteDictByIds };