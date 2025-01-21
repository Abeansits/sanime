const BREAK_TIME = 2000; // Time to break a chest in milliseconds
const GEMS = [
    { name: 'Dirt', image: 'dirt.png', rarity: 0.00005, class: 'ultra' },
    { name: 'Netherite', image: 'netherite.png', rarity: 0.02, class: 'mythic' },
    { name: 'Diamond', image: 'diamond.png', rarity: 0.05, class: 'legendary' },
    { name: 'Ruby', image: 'ruby.png', rarity: 0.10, class: 'epic' },
    { name: 'Sapphire', image: 'sapphire.png', rarity: 0.15, class: 'rare' },
    { name: 'Emerald', image: 'emerald.png', rarity: 0.28, class: 'uncommon' },
    { name: 'Amethyst', image: 'amethyst.png', rarity: 0.399950, class: 'common' }
];

class TreasureGrid {
    constructor() {
        this.container = document.getElementById('grid-container');
        this.breakingSound = document.getElementById('breakingSound');
        this.commonSound = new Audio('Common.mp3');
        this.uncommonSound = new Audio('Uncommon.mp3');
        this.legendarySound = new Audio('Legendary.mp3');
        this.resetButton = document.getElementById('reset-button');
        this.cheatButton = document.getElementById('cheat-button');
        this.autoPlayToggle = document.getElementById('auto-play-toggle');
        this.currentBreaking = null;
        this.breakingTimeout = null;
        this.collection = {};
        this.isCheatRunning = false;
        this.isAutoPlaying = false;
        this.selectedIndex = 0; // Track currently selected chest
        this.setupGrid();
        this.setupLegend();
        this.setupButtons();
        this.initializeCollection();
        this.setupKeyboardControls();
        this.setupSmartAutoRoll();
    }

    initializeCollection() {
        // Initialize collection counter for each gem type
        GEMS.forEach(gem => {
            this.collection[gem.name] = 0;
        });
        this.updateCollectionDisplay();
    }

    updateCollectionDisplay() {
        const container = document.getElementById('collection-stats');
        container.innerHTML = '';

        GEMS.forEach(gem => {
            const row = document.createElement('div');
            row.className = `collection-row rarity-${gem.class}`;

            const gemImage = document.createElement('div');
            gemImage.className = 'legend-color';
            gemImage.style.backgroundImage = `url('${gem.image}')`;

            const name = document.createElement('span');
            name.className = 'gem-name';
            name.textContent = gem.name;

            const count = document.createElement('span');
            count.className = 'gem-count';
            count.textContent = this.collection[gem.name];

            row.appendChild(gemImage);
            row.appendChild(name);
            row.appendChild(count);
            container.appendChild(row);
        });
    }

    setupKeyboardControls() {
        // Set initial selection
        const chests = Array.from(this.container.querySelectorAll('.chest'));
        this.selectedIndex = 0;
        chests[0].classList.add('selected');

        document.addEventListener('keydown', (e) => {
            if (this.isCheatRunning) return;
            
            const chests = Array.from(this.container.querySelectorAll('.chest'));
            let newIndex = this.selectedIndex;
            const gridWidth = 10; // Grid is 10x10

            switch(e.key) {
                case 'ArrowRight':
                    newIndex = Math.min(this.selectedIndex + 1, 99);
                    break;
                case 'ArrowLeft':
                    newIndex = Math.max(this.selectedIndex - 1, 0);
                    break;
                case 'ArrowUp':
                    newIndex = Math.max(this.selectedIndex - gridWidth, 0);
                    break;
                case 'ArrowDown':
                    newIndex = Math.min(this.selectedIndex + gridWidth, 99);
                    break;
                case ' ': // Spacebar
                    e.preventDefault(); // Prevent page scroll
                    if (!chests[this.selectedIndex].dataset.broken) {
                        this.startBreaking(chests[this.selectedIndex]);
                    }
                    return;
            }

            // Update selection if changed
            if (newIndex !== this.selectedIndex) {
                chests[this.selectedIndex].classList.remove('selected');
                this.selectedIndex = newIndex;
                chests[this.selectedIndex].classList.add('selected');
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                this.stopBreaking();
            }
        });
    }

    setupGrid() {
        for (let i = 0; i < 100; i++) {
            const chest = document.createElement('div');
            chest.className = 'chest';
            chest.addEventListener('mousedown', () => this.startBreaking(chest));
            chest.addEventListener('mouseup', () => this.stopBreaking());
            chest.addEventListener('mouseleave', () => this.stopBreaking());
            chest.addEventListener('mouseenter', () => {
                // Update selection on mouse hover
                const chests = Array.from(this.container.querySelectorAll('.chest'));
                chests[this.selectedIndex].classList.remove('selected');
                this.selectedIndex = i;
                chest.classList.add('selected');
            });
            this.container.appendChild(chest);
        }
    }

    setupLegend() {
        const legendContainer = document.getElementById('legend-items');
        
        GEMS.forEach(gem => {
            const legendItem = document.createElement('div');
            legendItem.className = `legend-item rarity-${gem.class}`;
            
            const gemImage = document.createElement('div');
            gemImage.className = 'legend-color';
            gemImage.style.backgroundImage = `url('${gem.image}')`;
            
            const info = document.createElement('div');
            info.className = 'legend-info';
            
            // Format the chance percentage based on rarity
            let chanceText;
            if (gem.rarity < 0.0001) {  // For super rare items (less than 0.01%)
                chanceText = `${(gem.rarity * 100).toFixed(4)}%`;
            } else if (gem.rarity < 0.01) {  // For rare items (less than 1%)
                chanceText = `${(gem.rarity * 100).toFixed(3)}%`;
            } else {  // For common items
                chanceText = `${(gem.rarity * 100).toFixed(1)}%`;
            }
            
            info.innerHTML = `
                <strong>${gem.name}</strong><br>
                Chance: ${chanceText}
            `;
            
            legendItem.appendChild(gemImage);
            legendItem.appendChild(info);
            legendContainer.appendChild(legendItem);
        });
    }

    setupButtons() {
        this.resetButton.addEventListener('click', () => this.resetGrid());
        this.cheatButton.addEventListener('click', () => this.cheatOpenAll());
        this.autoPlayToggle.addEventListener('change', () => this.toggleAutoPlay());
    }

    async cheatOpenAll() {
        if (this.isCheatRunning) return;
        
        this.isCheatRunning = true;
        this.cheatButton.disabled = true;
        
        const unbrokenChests = Array.from(this.container.querySelectorAll('.chest'))
            .filter(chest => !chest.dataset.broken);
        
        // Break chests in waves (10 at a time, one row)
        const CHESTS_PER_WAVE = 10; // Changed to 10 to match grid width
        const WAVE_DELAY = 500; // ms between waves (rows)
        const CHEST_DELAY = 100; // ms between chests in same wave
        
        for (let i = 0; i < unbrokenChests.length; i += CHESTS_PER_WAVE) {
            const wave = unbrokenChests.slice(i, i + CHESTS_PER_WAVE);
            
            // Process each chest in the wave (left to right)
            const wavePromises = wave.map((chest, index) => {
                return new Promise(resolve => {
                    setTimeout(async () => {
                        await this.quickBreakChest(chest);
                        resolve();
                    }, index * CHEST_DELAY);
                });
            });
            
            await Promise.all(wavePromises);
            
            // Wait before starting next wave (next row)
            if (i + CHESTS_PER_WAVE < unbrokenChests.length) {
                await new Promise(resolve => setTimeout(resolve, WAVE_DELAY));
            }
        }

        // Wait a bit longer for final animations
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.isCheatRunning = false;
        this.cheatButton.disabled = false;
    }

    setupSmartAutoRoll() {
        const smartToggle = document.createElement('div');
        smartToggle.className = 'toggle-container';
        smartToggle.innerHTML = `
            <label class="toggle">
                <input type="checkbox" id="smart-auto-toggle">
                <span class="toggle-label">Smart Auto-Roll (Stop on Rare+)</span>
            </label>
        `;
        document.querySelector('.button-group').appendChild(smartToggle);
        
        this.smartAutoToggle = document.getElementById('smart-auto-toggle');
    }

    playGemSound(gemClass) {
        // Stop any playing sounds
        this.commonSound.pause();
        this.commonSound.currentTime = 0;
        this.uncommonSound.pause();
        this.uncommonSound.currentTime = 0;
        this.legendarySound.pause();
        this.legendarySound.currentTime = 0;

        // Play appropriate sound based on rarity
        switch(gemClass) {
            case 'common':
                this.commonSound.play();
                break;
            case 'uncommon':
                this.uncommonSound.play();
                break;
            case 'rare':
            case 'epic':
            case 'legendary':
            case 'mythic':
            case 'ultra':
                this.legendarySound.play();
                break;
        }
    }

    async quickBreakChest(chest) {
        return new Promise(resolve => {
            chest.classList.add('breaking');
            this.breakingSound.currentTime = 0;
            this.breakingSound.play();
            
            setTimeout(() => {
                chest.dataset.broken = 'true';
                chest.classList.remove('breaking');
                this.breakingSound.pause();
                
                const gem = this.getRandomGem();
                chest.style.backgroundImage = 'none';
                
                // Create gem element with image
                const gemElement = document.createElement('div');
                gemElement.className = `gem rarity-${gem.class}`;
                gemElement.style.backgroundImage = `url('${gem.image}')`;
                chest.appendChild(gemElement);
                
                // Play appropriate sound
                this.playGemSound(gem.class);
                
                // Update collection
                this.collection[gem.name]++;
                this.updateCollectionDisplay();
                
                // Trigger animation
                setTimeout(() => {
                    gemElement.classList.add('revealed');
                    // Resolve after the reveal animation
                    setTimeout(() => resolve(gem), 500);
                }, 50);
            }, 200);
        });
    }

    async resetGrid(resetCollection = true) {
        // Stop any ongoing breaking
        this.stopBreaking();
        
        // Reset collection only if specified
        if (resetCollection) {
            this.initializeCollection();
        }
        
        // Remove all gems and restore chests
        const chests = this.container.querySelectorAll('.chest');
        chests.forEach(chest => {
            delete chest.dataset.broken;
            chest.classList.remove('breaking');
            // Remove all child elements
            while (chest.firstChild) {
                chest.removeChild(chest.firstChild);
            }
            chest.style.backgroundImage = 'url("chest.png")';
        });

        // Wait for any animations to complete
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    startBreaking(chest) {
        if (chest.dataset.broken || this.currentBreaking) return;
        
        this.currentBreaking = chest;
        chest.classList.add('breaking');
        this.breakingSound.currentTime = 0;
        this.breakingSound.play();
        
        this.breakingTimeout = setTimeout(() => {
            this.breakChest(chest);
        }, BREAK_TIME);
    }

    stopBreaking() {
        if (!this.currentBreaking) return;
        
        this.currentBreaking.classList.remove('breaking');
        this.breakingSound.pause();
        this.breakingSound.currentTime = 0;
        clearTimeout(this.breakingTimeout);
        this.currentBreaking = null;
    }

    breakChest(chest) {
        chest.dataset.broken = 'true';
        chest.classList.remove('breaking');
        this.breakingSound.pause();
        
        const gem = this.getRandomGem();
        chest.style.backgroundImage = 'none';
        
        // Create gem element with image
        const gemElement = document.createElement('div');
        gemElement.className = `gem rarity-${gem.class}`;
        gemElement.style.backgroundImage = `url('${gem.image}')`;
        chest.appendChild(gemElement);
        
        // Play appropriate sound
        this.playGemSound(gem.class);
        
        // Update collection
        this.collection[gem.name]++;
        this.updateCollectionDisplay();
        
        // Trigger animation
        setTimeout(() => {
            gemElement.classList.add('revealed');
        }, 50);
        
        this.currentBreaking = null;
    }

    getRandomGem() {
        const rand = Math.random();
        let cumulativeProbability = 0;
        
        for (const gem of GEMS) {
            cumulativeProbability += gem.rarity;
            if (rand <= cumulativeProbability) {
                return gem;
            }
        }
        return GEMS[0]; // Fallback to first gem
    }

    async toggleAutoPlay() {
        this.isAutoPlaying = this.autoPlayToggle.checked;
        if (this.isAutoPlaying) {
            this.startAutoPlay();
        }
    }

    async startAutoPlay() {
        while (this.isAutoPlaying) {
            const unbrokenChests = Array.from(this.container.querySelectorAll('.chest'))
                .filter(chest => !chest.dataset.broken);
            
            if (unbrokenChests.length === 0) {
                await this.resetGrid(false);
                continue;
            }

            const chest = unbrokenChests[0];
            const gem = await this.quickBreakChest(chest);

            // If smart auto-roll is enabled and we got a rare or better gem, stop
            if (this.smartAutoToggle.checked && 
                ['rare', 'epic', 'legendary', 'mythic', 'ultra'].includes(gem.class)) {
                this.isAutoPlaying = false;
                this.autoPlayToggle.checked = false;
                break;
            }

            // Small delay between chests
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new TreasureGrid();
});

// Add legend toggle functionality
document.getElementById('legend-toggle').addEventListener('click', () => {
    const legend = document.getElementById('legend');
    legend.classList.toggle('hidden');
}); 
