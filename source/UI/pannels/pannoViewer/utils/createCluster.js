
/**
 * Create a Cluster EBML node.
 *
 * @param {Cluster} cluster
 *
 * Returns an EBML element.
 */
export function createCluster(cluster) {
    return {
        'id': 0x1f43b675,
        'data': [{
            'id': 0xe7,  // Timecode
            'data': Math.round(cluster.timecode)
        }]
    };
}