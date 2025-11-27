-- Check for duplicate menu items
SELECT key, label, COUNT(*) as count
FROM menu_items
GROUP BY key, label
HAVING COUNT(*) > 1;

-- If duplicates exist, delete them keeping only one
-- First, let's see all menu items
SELECT * FROM menu_items ORDER BY display_order;

-- To remove duplicates (if found), use this:
-- DELETE FROM menu_items 
-- WHERE id NOT IN (
--   SELECT MIN(id)
--   FROM menu_items
--   GROUP BY key
-- );

-- Then verify the menu structure
SELECT 
    mi.id,
    mi.key,
    mi.label,
    mi.path,
    mi.icon,
    mi.parent_id,
    mi.display_order,
    p.name as required_permission
FROM menu_items mi
LEFT JOIN permissions p ON mi.required_permission_id = p.id
ORDER BY mi.display_order;
