// Commands Management JavaScript

// Global variable to store commands data
let commandsData = [];

// Initialize commands data from server
function initializeCommandsData(commands) {
    commandsData = commands;
}

function viewCommandDetails(commandId) {
    console.log('Viewing command details for ID:', commandId);
    const command = commandsData.find(cmd => cmd.id == commandId);
    
    if (command) {
        let content = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>${command.id}</td></tr>
                        <tr><td><strong>Player:</strong></td><td>${command.player_nick || 'Unknown'}</td></tr>
                        <tr><td><strong>Army:</strong></td><td>${command.army_name || 'Unknown'}</td></tr>
                        <tr><td><strong>Turn:</strong></td><td>${command.turn_display || 'Unknown'}</td></tr>
                        <tr><td><strong>Type:</strong></td><td>${command.command_type}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${command.status}</td></tr>
                        <tr><td><strong>Created:</strong></td><td>${new Date(command.created_at).toLocaleString()}</td></tr>
                        <tr><td><strong>Updated:</strong></td><td>${new Date(command.updated_at).toLocaleString()}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Command Data</h6>
                    <pre class="bg-light p-2 rounded">${JSON.stringify(JSON.parse(command.command_data || '{}'), null, 2)}</pre>
                </div>
            </div>
        `;
        
        if (command.result) {
            content += `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Result</h6>
                        <pre class="bg-light p-2 rounded">${JSON.stringify(JSON.parse(command.result), null, 2)}</pre>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('commandDetailsContent').innerHTML = content;
        const modal = new bootstrap.Modal(document.getElementById('commandDetailsModal'));
        
        // Handle focus management
        modal._element.addEventListener('hidden.bs.modal', function() {
            // Remove focus from any focused element inside the modal
            const focusedElement = document.activeElement;
            if (focusedElement && modal._element.contains(focusedElement)) {
                focusedElement.blur();
            }
        });
        
        modal.show();
    }
}

function editCommandStatus(commandId, currentStatus) {
    console.log('editCommandStatus called with:', commandId, currentStatus);
    
    const commandIdInput = document.getElementById('editCommandId');
    const statusSelect = document.getElementById('editStatus');
    const resultTextarea = document.getElementById('editResult');
    const modal = document.getElementById('editStatusModal');
    
    if (!commandIdInput || !statusSelect || !resultTextarea || !modal) {
        console.error('Required elements not found:', {
            commandIdInput: !!commandIdInput,
            statusSelect: !!statusSelect,
            resultTextarea: !!resultTextarea,
            modal: !!modal
        });
        return;
    }
    
    commandIdInput.value = commandId;
    statusSelect.value = currentStatus;
    resultTextarea.value = '';
    
    const bootstrapModal = new bootstrap.Modal(modal);
    
    // Handle focus management
    modal.addEventListener('hidden.bs.modal', function() {
        // Remove focus from any focused element inside the modal
        const focusedElement = document.activeElement;
        if (focusedElement && modal.contains(focusedElement)) {
            focusedElement.blur();
        }
    });
    
    bootstrapModal.show();
}

function saveCommandStatus() {
    const commandId = document.getElementById('editCommandId').value;
    const status = document.getElementById('editStatus').value;
    const result = document.getElementById('editResult').value;
    
    // Send update request
    fetch(`/admin/commands/update/${commandId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: status,
            result: result || null
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('Error updating command: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating command');
    });
}

// Initialize with server data from data attribute and set up event delegation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Commands script loaded and DOM ready');
    
    const dataElement = document.getElementById('commands-data');
    if (dataElement) {
        commandsData = JSON.parse(dataElement.getAttribute('data-commands'));
        console.log('Commands data loaded:', commandsData.length, 'commands');
    } else {
        console.error('Commands data element not found');
    }
    
    // Set up event delegation for buttons
    document.addEventListener('click', function(e) {
        console.log('Click event on:', e.target);
        console.log('Has data-action:', e.target.getAttribute('data-action'));
        
        if (e.target.matches('[data-action="view"]')) {
            console.log('View button clicked');
            const commandId = e.target.getAttribute('data-command-id');
            viewCommandDetails(commandId);
        } else if (e.target.matches('[data-action="edit"]')) {
            console.log('Edit button clicked');
            const commandId = e.target.getAttribute('data-command-id');
            const commandStatus = e.target.getAttribute('data-command-status');
            editCommandStatus(commandId, commandStatus);
        }
    });
    
    console.log('Event listeners set up');
});
