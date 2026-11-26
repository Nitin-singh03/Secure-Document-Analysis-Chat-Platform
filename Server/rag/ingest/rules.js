import fs from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';

export const loadKbConfig = async (rootDir) => {
    const configPath = path.join(path.resolve(rootDir), 'kb.config.json');
    try {
        const raw = await fs.readFile(configPath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
};

const normalizeFrontMatterTags = (frontMatter) => {
    if (!frontMatter || !frontMatter.tags) return [];
    if (Array.isArray(frontMatter.tags)) return frontMatter.tags.map((t) => String(t).trim()).filter(Boolean);
    return [String(frontMatter.tags).trim()].filter(Boolean);
};

export const applyRules = ({ relativePosixPath, frontMatter = null, kbConfig = null }) => {
    const frontMatterTags = normalizeFrontMatterTags(frontMatter);
    const baseMetadata = frontMatter ? { ...frontMatter } : {};

    if (!kbConfig) {
        return {
            authority: 'normal',
            tags: frontMatterTags,
            metadata: baseMetadata
        };
    }

    const defaults = kbConfig.defaults || {};
    let authority = defaults.authority || 'normal';
    const tags = new Set([...(Array.isArray(defaults.tags) ? defaults.tags : []), ...frontMatterTags]);
    const metadata = {
        ...(defaults.metadata && typeof defaults.metadata === 'object' ? defaults.metadata : {}),
        ...baseMetadata
    };

    const rules = Array.isArray(kbConfig.rules) ? kbConfig.rules : [];
    const filename = path.posix.basename(relativePosixPath);
    const filenameNoExt = path.posix.basename(relativePosixPath, path.posix.extname(relativePosixPath));

    for (const rule of rules) {
        if (!rule?.pattern) continue;
        const isMatch = picomatch(rule.pattern);
        if (!isMatch(relativePosixPath)) continue;

        if (rule.authority) authority = rule.authority;
        if (rule.docType) metadata.docType = rule.docType;

        if (Array.isArray(rule.tags)) {
            for (const t of rule.tags) tags.add(String(t));
        }

        let primaryEntity = null;
        const extraEntities = [];

        if (rule.entityRegex) {
            const re = new RegExp(rule.entityRegex);
            const m = filename.match(re);
            if (m) {
                const groups = rule.entityGroups || {};
                if (typeof groups.entity === 'number' && m[groups.entity]) {
                    primaryEntity = m[groups.entity].trim();
                }
                if (Array.isArray(groups.extra)) {
                    for (const idx of groups.extra) {
                        if (m[idx]) extraEntities.push(m[idx].trim());
                    }
                }
            }
        } else if (rule.entityFrom === 'filename') {
            primaryEntity = filenameNoExt;
        } else if (rule.entityFrom && frontMatter && frontMatter[rule.entityFrom]) {
            primaryEntity = String(frontMatter[rule.entityFrom]).trim();
        }

        if (primaryEntity) {
            metadata.entity = primaryEntity;
            metadata.entities = Array.from(new Set([primaryEntity, ...extraEntities]));
        }

        if (rule.tagPrefix) {
            if (metadata.docType) tags.add(`type:${metadata.docType}`);
            if (Array.isArray(metadata.entities)) {
                for (const ent of metadata.entities) {
                    tags.add(`entity:${ent}`);
                }
            }
        }

        break;
    }

    return {
        authority,
        tags: Array.from(tags),
        metadata
    };
};
