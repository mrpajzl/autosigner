<template>
  <div class="mt-10 px-5 max-w-4xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent"></div>
      <div class="absolute top-4 right-4 opacity-20">
        <UIcon name="i-heroicons-tv" class="w-24 h-24 text-white" />
      </div>
      <div class="relative space-y-4">
        <div class="flex items-center gap-2 text-red-400 text-sm font-medium">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Návod</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white">
          Sideloading aplikací na Apple TV
        </h1>
        <p class="text-lg text-white/70 max-w-2xl">
          Kompletní průvodce instalací aplikací na Apple TV pomocí Apple Configurator 2
        </p>
      </div>
    </div>

    <!-- Requirements -->
    <div class="rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-amber-500/20">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-amber-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Co budete potřebovat</h3>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1">
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>Mac</strong> s nainstalovaným Apple Configurator 2</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>Apple TV 4K</strong> nebo Apple TV HD</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>Stejná Wi-Fi síť</strong> pro Mac i Apple TV</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>IPA soubor</strong> aplikace stažený z FastSigner</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Important notice -->
    <div class="rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-red-500/20">
          <UIcon name="i-heroicons-exclamation-circle" class="w-6 h-6 text-red-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Důležité</h3>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Ujistěte se, že máte <strong>vše aktualizované</strong> - Apple TV, macOS i Apple Configurator 2. 
            Zastaralý software může způsobovat problémy s párováním.
          </p>
        </div>
      </div>
    </div>

    <!-- Steps -->
    <div class="space-y-6">
      <!-- Step 1 -->
      <div class="step-card group">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3 class="step-title">Stáhněte Apple Configurator 2</h3>
          <div class="step-description">
            <p>
              Apple Configurator 2 je bezplatná aplikace od Applu dostupná v Mac App Store. 
              Pokud ji ještě nemáte, stáhněte a nainstalujte ji.
            </p>
            <UButton
              to="https://apps.apple.com/cz/app/apple-configurator-2/id1037126344"
              target="_blank"
              color="red"
              variant="soft"
              size="sm"
              class="mt-3"
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 mr-1" />
              Otevřít v App Store
            </UButton>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="step-card group">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3 class="step-title">Stáhněte IPA soubor aplikace</h3>
          <div class="step-description">
            <p>
              Na hlavní stránce FastSigner klikněte na aplikaci pro Apple TV, kterou chcete nainstalovat.
              Soubor se stáhne ve formátu <code>.ipa</code>.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="step-card group">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3 class="step-title">Připravte Apple TV na párování</h3>
          <div class="step-description">
            <p>
              Na Apple TV přejděte do nastavení pro párování:
            </p>
            <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
              <div class="flex items-center gap-2 text-white font-mono text-sm">
                <span class="text-slate-400">Settings</span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
                <span class="text-slate-400">Remotes and Devices</span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
                <span class="text-red-400 font-semibold">Remote App and Devices</span>
              </div>
            </div>
            <div class="mt-3 p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 inline mr-1" />
              <span class="text-slate-600 dark:text-white/70">
                Zůstaňte na této obrazovce - párování funguje pouze když jste v tomto menu!
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="step-card group">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3 class="step-title">Spusťte párování v Apple Configurator</h3>
          <div class="step-description">
            <p>
              V Apple Configurator 2 na Macu:
            </p>
            <ol class="mt-3 space-y-2 text-slate-600 dark:text-white/70">
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">a.</span>
                <span>Klikněte na <strong>Apple Configurator</strong> v horním menu</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">b.</span>
                <span>Vyberte <strong>Paired Devices</strong></span>
              </li>
            </ol>
            <div class="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-white/5">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-wifi" class="w-8 h-8 text-blue-500" />
                <div>
                  <p class="font-medium text-slate-800 dark:text-white">Bezdrátové párování</p>
                  <p class="text-sm text-slate-600 dark:text-white/70">Mac a Apple TV musí být na stejné Wi-Fi síti</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="step-card group">
        <div class="step-number">5</div>
        <div class="step-content">
          <h3 class="step-title">Spárujte Apple TV</h3>
          <div class="step-description">
            <p>
              V dialogovém okně by se měla zobrazit vaše Apple TV. Klikněte na ni pro spárování.
              Na Apple TV se zobrazí PIN kód, který zadejte do Apple Configurator.
            </p>
            <div class="mt-3 p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 text-sm">
              <UIcon name="i-heroicons-light-bulb" class="w-4 h-4 text-amber-500 inline mr-1" />
              <span class="text-slate-600 dark:text-white/70">
                Pokud se Apple TV nezobrazuje, zkuste zrušit případné staré párování na obou zařízeních a zkuste to znovu.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6 -->
      <div class="step-card group">
        <div class="step-number">6</div>
        <div class="step-content">
          <h3 class="step-title">Otevřete okno Applications</h3>
          <div class="step-description">
            <p>
              Po úspěšném spárování klikněte na Apple TV v Apple Configurator a otevřete aplikace:
            </p>
            <ol class="mt-3 space-y-2 text-slate-600 dark:text-white/70">
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">a.</span>
                <span>V horním menu vyberte <strong>Window</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">b.</span>
                <span>Klikněte na <strong>Applications</strong></span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Step 7 -->
      <div class="step-card group">
        <div class="step-number">7</div>
        <div class="step-content">
          <h3 class="step-title">Přetáhněte IPA soubor</h3>
          <div class="step-description">
            <p>
              Stažený IPA soubor z Finderu přetáhněte pomocí <strong>drag and drop</strong> do okna Applications v Apple Configurator.
            </p>
            <div class="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-white/5">
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <UIcon name="i-heroicons-folder" class="w-10 h-10 text-blue-500 mx-auto" />
                  <span class="text-xs text-slate-500 dark:text-white/60 mt-1 block">Finder</span>
                </div>
                <UIcon name="i-heroicons-arrow-long-right" class="w-8 h-8 text-slate-400 animate-pulse" />
                <div class="text-center">
                  <UIcon name="i-heroicons-square-2-stack" class="w-10 h-10 text-red-500 mx-auto" />
                  <span class="text-xs text-slate-500 dark:text-white/60 mt-1 block">Applications</span>
                </div>
              </div>
            </div>
            <div class="mt-3 p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 inline mr-1" />
              <span class="text-slate-600 dark:text-white/70">
                Po přetažení se instalace spustí automaticky.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 8 -->
      <div class="step-card group">
        <div class="step-number">8</div>
        <div class="step-content">
          <h3 class="step-title">Hotovo! 🎉</h3>
          <div class="step-description">
            <p>
              Počkejte na dokončení instalace. Aplikace se poté zobrazí na domovské obrazovce Apple TV.
            </p>
            <div class="mt-4 flex items-center gap-3">
              <div class="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div class="h-full w-3/4 rounded-full bg-gradient-to-r from-red-500 to-violet-500 animate-pulse"></div>
              </div>
              <span class="text-sm text-slate-500 dark:text-white/60">Instalace...</span>
            </div>
            <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-check-badge" class="w-8 h-8 text-emerald-500" />
                <div>
                  <p class="font-semibold text-slate-800 dark:text-white">Aplikace nainstalována</p>
                  <p class="text-sm text-slate-600 dark:text-white/70">Nyní ji najdete na ploše Apple TV</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 text-slate-500" />
        <h3 class="font-semibold text-slate-800 dark:text-white">Řešení problémů</h3>
      </div>
      
      <div class="space-y-4">
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Apple TV se nezobrazuje při párování</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Ujistěte se, že jste na Apple TV v menu <strong>Settings → Remotes and Devices → Remote App and Devices</strong></li>
            <li>• Zkontrolujte, že Mac a Apple TV jsou na stejné Wi-Fi síti</li>
            <li>• Zrušte staré párování v Apple Configurator i na Apple TV</li>
            <li>• Zkuste párování znovu</li>
            <li>• Restartujte Apple TV i Mac</li>
            <li>• Ujistěte se, že máte nejnovější verzi všeho (tvOS, macOS, Apple Configurator)</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Instalace selže</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Zkontrolujte, zda je vaše zařízení registrováno ve FastSigner</li>
            <li>• Ověřte, že aplikace je správně podepsaná (status "Podepsáno")</li>
            <li>• Zkuste aplikaci stáhnout znovu</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Aplikace se nespustí</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Restartujte Apple TV</li>
            <li>• Zkontrolujte, zda profil ještě nevypršel</li>
            <li>• Kontaktujte podporu na Discordu</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Back to home -->
    <div class="flex justify-center">
      <UButton to="/" color="gray" variant="ghost" size="lg">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
        Zpět na hlavní stránku
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Sideloading na Apple TV'
})
</script>

<style scoped>
.step-card {
  @apply flex gap-4 p-6 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300;
}

.step-card:hover {
  @apply border-red-500/30 shadow-lg shadow-red-500/5;
}

.step-number {
  @apply flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-violet-500 text-white font-bold flex items-center justify-center text-lg shadow-lg;
}

.step-content {
  @apply flex-1 space-y-2;
}

.step-title {
  @apply text-lg font-semibold text-slate-800 dark:text-white;
}

.step-description {
  @apply text-slate-600 dark:text-white/70;
}

.step-description p {
  @apply leading-relaxed;
}

.step-description code {
  @apply px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-sm;
}

.kbd {
  @apply inline-flex items-center justify-center px-2 py-1 rounded bg-slate-200 dark:bg-white/20 text-xs font-mono font-medium text-slate-700 dark:text-white/90 shadow-sm;
}
</style>

