const vectorIndex = {
    name: 'vector_index',
    type: 'vectorSearch',
    definition: {
        fields: [
            {
                type: 'vector',
                path: 'embedding',
                numDimensions: 768,
                similarity: 'cosine'
            },
            { type: 'filter', path: 'userId' },
            { type: 'filter', path: 'collectionId' },
            { type: 'filter', path: 'documentId' },
            { type: 'filter', path: 'chunkerVersion' },
            { type: 'filter', path: 'status' },
            { type: 'filter', path: 'folderPath' },
            { type: 'filter', path: 'tags' }
        ]
    }
};

console.log(JSON.stringify(vectorIndex, null, 2));
