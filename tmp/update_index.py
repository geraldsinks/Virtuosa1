import re
import os

file_path = r'c:\Users\HP USER\Desktop\Virtuosa\client\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the target block and replacement block
target_pattern = re.escape('                    return `') + r'.*?' + re.escape('                  `;')
# We need to be careful with the target because there might be another return later, but this one is inside the map.
# Let's find the map first.

map_start = content.find('categoryGrid.innerHTML = activeCards.map((card, index) => {')
map_end = content.find("}).join('');", map_start) + 12

if map_start == -1:
    print("Could not find map start")
    exit(1)

category_map_block = content[map_start:map_end]

# New render function content
new_block = """categoryGrid.innerHTML = activeCards.map((card, index) => {
                    const isRectangle = card.cardType === 'rectangle';
                    // Mobile: Rectangle takes 2 columns. Desktop: Everything takes 1 column for uniform gallery.
                    const cardClass = isRectangle ? 'category-card rectangle-card col-span-2 lg:col-span-1' : 'category-card square-card col-span-1 lg:col-span-1';
                    
                    // Sanitize and handle both absolute and relative URLs for images
                    const fallbackUrl = `https://placehold.co/400x200?text=${encodeURIComponent(card.title)}`;
                    const sanitizedUrl = sanitizeImageUrl(card.image, fallbackUrl);
                    const imageUrl = sanitizedUrl.startsWith('http') ? 
                        sanitizedUrl : 
                        (card.image ? `https://api.virtuosazm.com${sanitizedUrl}` : fallbackUrl);

                    return `
                <div class="${cardClass} group flex flex-col transition-all duration-300">
                    <div class="${isRectangle ? 'aspect-[2/1] lg:aspect-square' : 'aspect-square'} relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-200 bg-white">
                        <picture>
                            <source srcset="${generateOptimizedCloudinaryUrl(imageUrl, 400, isRectangle ? 200 : 400)} 400w,
                                    ${generateOptimizedCloudinaryUrl(imageUrl, 768, isRectangle ? 384 : 768)} 768w" 
                                    type="image/webp">
                            <img src="${imageUrl}" 
                                 class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                 alt="${encodeHtml(card.title)}" 
                                 loading="${index < 4 ? 'eager' : 'lazy'}">
                        </picture>
                        
                        <!-- Mobile Overlay Layout (Hidden on Desktop) -->
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-80 lg:opacity-0 transition-opacity group-hover:opacity-90 lg:group-hover:opacity-0 pointer-events-none"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-5 z-10 w-full text-left lg:hidden">
                            <h3 class="font-bold text-white text-base sm:text-lg drop-shadow-md tracking-tight leading-tight">${encodeHtml(card.title)}</h3>
                            ${card.description ? `<p class="text-white text-xs opacity-80 mt-1 line-clamp-1">${encodeHtml(card.description)}</p>` : ''}
                        </div>
                        
                        <a href="${sanitizeUrl(card.link ? (card.link.startsWith('/') ? card.link : '/pages/' + card.link) : '#')}" class="absolute inset-0 z-20">
                            <span class="sr-only">Explore ${encodeHtml(card.title)}</span>
                        </a>
                    </div>
                    
                    <!-- Desktop Label Layout (Visible only on Desktop) -->
                    <div class="hidden lg:block pt-3 px-1">
                        <h3 class="font-bold text-navy text-base group-hover:text-gold transition-colors duration-300 truncate">${encodeHtml(card.title)}</h3>
                        ${card.description ? `<p class="text-gray-500 text-xs mt-0.5 line-clamp-1">${encodeHtml(card.description)}</p>` : ''}
                    </div>
                </div>
                  `;
                }).join('');"""

# Escape target content for replacement
new_content = content[:map_start] + new_block + content[map_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated index.html")
