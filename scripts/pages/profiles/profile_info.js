(async () => {
    function parseAgeGroup(label) {
        if (!label) return null;
        
        // Quitar el prefijo "AgeGroup"
        const age = label.replace('Label.AgeGroup', '');
        
        // Over21 → "21+"
        if (age.startsWith('Over')) {
            return age.replace('Over', '') + '+';
        }
        
        // Under9 → "<9"
        if (age.startsWith('Under')) {
            return '<' + age.replace('Under', '');
        }
        
        // 12To15 → "12-15"
        if (age.includes('To')) {
            return age.replace('To', '-');
        }
        
        return age;
    }
    
    function formatTimeAgo(seconds, maxUnits = 2) {
        const date = new Date(seconds * 1000);
        const now = new Date();
        
        // Calcular diferencia total en milisegundos
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        
        // Si es menos de un día, mostrar horas/minutos/segundos
        if (diffSeconds < 86400) { // 86400 segundos = 1 día
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const secs = diffSeconds % 60;
            
            const parts = [];
            if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
            if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
            if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
            
            return parts.slice(0, maxUnits).join(', ');
        }
        
        // Si es más de un día, calcular años/meses/días
        let years = now.getFullYear() - date.getFullYear();
        let months = now.getMonth() - date.getMonth();
        let days = now.getDate() - date.getDate();
        
        if (days < 0) {
            months--;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        const parts = [];
        if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
        if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        
        return parts.length > 0 ? parts.slice(0, maxUnits).join(', ') : '0 seconds';
    }

    async function getDetails(id) {
        const data = await getProfileInsights([id])
        const insights = data.reduce((acc, item) => {
            const { insightCase, ...insight } = item;
            const [key, value] = Object.entries(insight)[0];
            
            const cleanKey = key.replace('Insight', '');
            acc[cleanKey] = value;
            
            return acc;
        }, {});

        return insights
    }

    if (window.location.href.includes("/profile")) {        
        const userId = window.location.href.split("/").at(-2)
        log("Loaded profile for user", userId)

        const insights = await getDetails(userId)
        console.log(insights)

        let age_group = null
        if (insights.userAgeVerified?.verifiedAgeBandLabel) {
            age_group = parseAgeGroup(insights.userAgeVerified?.verifiedAgeBandLabel)
        }
        let friends_since = null
        if (insights.friendshipAge?.friendsSinceDateTime?.seconds) {
            friends_since = formatTimeAgo(insights.friendshipAge?.friendsSinceDateTime?.seconds)
        }

        console.log(age_group, friends_since)

        observeElement(".user-profile-header-info", (profileHeaderEl) => {
            if (age_group) {
                const username_div = profileHeaderEl.querySelector(".stylistic-alts-username").closest("div")
                username_div.classList.add("flex", "items-center", "gap-xsmall")
                username_div.insertAdjacentHTML("beforeend", `
                    <p>· Age ${age_group}</p>    
                `)
            }

            if (friends_since) {
                const infoEl = profileHeaderEl.querySelector(".stylistic-alts-username").closest("div").parentElement
                infoEl.insertAdjacentHTML("beforeend", `
                    <p style="margin-top: 2px; font-size: 14px !important;">Friends since ${friends_since}</p>
                `)
            }
        })
    }
})();